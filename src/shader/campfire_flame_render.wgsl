// Lagerfeur-Flammen-Render-Shader (Vertex + Fragment)
// Zeichnet Flammenpartikel als kameraausgerichtete Billboards (kleine Quads).

struct Particle {
  position: vec3<f32>,
  age: f32,
  velocity: vec3<f32>,
  lifetime: f32,
};

struct ModelUniforms {
  model: mat4x4<f32>,
};

struct ViewProjUniforms {
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> modelUniforms: ModelUniforms;
@group(1) @binding(0) var<uniform> viewProjUniforms: ViewProjUniforms;
@group(2) @binding(0) var<storage, read> particles: array<Particle>;

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

  let particle = particles[instanceIndex];
  let life = clamp(1.0 - (particle.age / particle.lifetime), 0.0, 1.0);

  // Tote Partikel unsichtbar machen (degeneriertes Dreieck)
  if (life <= 0.0) {
    return VertexOutput(vec4<f32>(0.0), vec4<f32>(0.0), vec2<f32>(0.0));
  }

  // Quad-Größe abhängig von verbleibender Lebenszeit
  // Flammen sind anfangs klein und werden während des Aufstiegs größer
  let quadSize = 0.5 + 0.05 * life;
  let uv = quadVertices[vertexIndex];
  let quadVertex = uv * quadSize;

  // Partikelposition mit Model-Matrix transformieren (für mehrere Lagerfeuerstellen)
  let worldPos = modelUniforms.model * vec4<f32>(particle.position, 1.0);

  // Billboard: Offset im View-Space, damit das Quad immer zur Kamera zeigt
  let viewPos = viewProjUniforms.view * worldPos;
  let billboardPos = viewPos + vec4<f32>(quadVertex, 0.0, 0.0);
  let clipPos = viewProjUniforms.projection * billboardPos;

  // Farbverlauf für Flammen: Gelb → Orange → dunkles Rot
  // life = 1.0 (jung): Gelb
  // life = 0.5 (mittel): Orange
  // life = 0.0 (alt): Dunkles Rot / Verblassend
  let color = vec4<f32>(
    1.0,                        // Rot bleibt immer hoch
    0.9 + life * 0.1,           // Grün: von 0.9 (jung) zu 1.0 (alt) - fallend
    0.0 + life * 0.3,           // Blau: von 0.0 zu 0.3 - steigend für Farbenübergang
    life * 0.9,                 // Alpha: sinkt mit Lebensfortschritt
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
