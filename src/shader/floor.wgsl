struct VertexInput {
  /* 0x00 - 0x0b */ @location(0) position: vec3<f32>,
  // Padding to 16 bytes for alignment
  /* 0x10 - 0x1f */ @location(1) color: vec4<f32>,
};

struct Uniforms {
  /* 0x00 - 0x3f */ view: mat4x4<f32>,
  /* 0x40 - 0x7f */ projection: mat4x4<f32>,
};

// Binding Group 0, Binding 0: Uniforms
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Vertex Output / Fragment Input
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

// Vertex Shader
@vertex fn vs(input: VertexInput) -> VertexOutput {
  let worldPosition = vec4<f32>(input.position, 1.0);
  let viewPosition = uniforms.view * worldPosition;
  let projectedPosition = uniforms.projection * viewPosition;

  return VertexOutput(
    projectedPosition,
    input.color,
  );
}

// Fragment Shader
@fragment fn fs(input: VertexOutput) -> @location(0) vec4<f32> {
  return input.color;
}
