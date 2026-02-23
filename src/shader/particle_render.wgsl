// Partikel-Render-Shader (Vertex + Fragment)
// Zeichnet Partikel als kameraausgerichtete Billboards (kleine Quads).

struct Particle {
  position: vec3<f32>,
  age: f32,
  velocity: vec3<f32>,
  lifetime: f32,
};

struct Uniforms {
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>,
};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> VertexOutput {
  // 6 Vertices für ein Quad (2 Dreiecke)
  var quadVertices = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0),
  );

  let p = particles[instanceIndex];
  let life = clamp(1.0 - (p.age / p.lifetime), 0.0, 1.0);

  // Tote Partikel unsichtbar machen (degeneriertes Dreieck)
  if (life <= 0.0) {
    return VertexOutput(vec4<f32>(0.0), vec4<f32>(0.0), vec2<f32>(0.0));
  }

  // Quad-Größe abhängig von verbleibender Lebenszeit
  let quadSize = 0.25 + 0.35 * life;
  let uv = quadVertices[vertexIndex];
  let quadVertex = uv * quadSize;

  // Billboard: Offset im View-Space, damit das Quad immer zur Kamera zeigt
  let worldPos = vec4<f32>(p.position, 1.0);
  let viewPos = uniforms.view * worldPos;
  let billboardPos = viewPos + vec4<f32>(quadVertex, 0.0, 0.0);
  let clipPos = uniforms.projection * billboardPos;

  // Farbe: Warm (weiß → gelb → orange → rot) mit Fade-Out
  let color = vec4<f32>(
    1.0,
    0.2 + life * 0.8,
    life * life * 0.3,
    life * 0.85,
  );

  return VertexOutput(clipPos, color, uv);
}

@fragment fn fs(input: VertexOutput) -> @location(0) vec4<f32> {
  // Kreisförmiges Partikel (alles außerhalb des Kreises verwerfen)
  let dist = length(input.uv);
  if (dist > 1.0) {
    discard;
  }

  // Weicher Abfall zum Rand hin
  let falloff = 1.0 - dist * dist;
  return vec4<f32>(input.color.rgb * falloff, input.color.a * falloff);
}
