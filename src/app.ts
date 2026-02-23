import { humanReadableSize, unknownToError, validateShaderModule } from "./common";
import Matrix4 from "./math/matrix4";
import { deg2rad } from "./math/utils";
import Vector3 from "./math/vector3";

import floorModule from "./shader/floor.wgsl?raw";
import particleSimModule from "./shader/particle_sim.wgsl?raw";
import particleRenderModule from "./shader/particle_render.wgsl?raw";
import campfireFlameSimModule from "./shader/campfire_flame_sim.wgsl?raw";

const PARTICLE_1_COUNT = 8192;
const PARTICLE_2_COUNT = 2048;

type GpuContext = {
  hasValidSize: boolean;

  canvas: HTMLCanvasElement;
  canvasContext: GPUCanvasContext;
  adapter: GPUAdapter;
  device: GPUDevice;

  width: number;
  height: number;

  depthTexture: GPUTexture;
  depthTextureView: GPUTextureView;

  // Sampler
  nearestSampler: GPUSampler;
  linearSampler: GPUSampler;

  // Vectoren und Matrizen
  eyePosition: Vector3;
  targetPosition: Vector3;
  upDirection: Vector3;
  viewMatrix: Matrix4;
  projectionMatrix: Matrix4;

  // View-Projection Matrix
  viewProjectionMatrixData: Float32Array;
  viewProjectionMatrixBuffer: GPUBuffer;
  viewProjectionMatrixBindGroupLayout: GPUBindGroupLayout;
  viewProjectionMatrixBindGroup: GPUBindGroup;

  // Floor
  floorShaderModule: GPUShaderModule;
  floorVertexCount: number;
  floorVertexBuffer: GPUBuffer;
  floorPipeline: GPURenderPipeline;

  // Particles (#1: Funkenflug oder Zündschnur-Effekt)
  particle1Buffer: GPUBuffer;
  particle1SimParamsBuffer: GPUBuffer;
  particle1SimParamsData: Float32Array;
  particle1SimBindGroupLayout: GPUBindGroupLayout;
  particle1SimBindGroup: GPUBindGroup;
  particle1SimPipeline: GPUComputePipeline;
  particle1RenderBindGroupLayout: GPUBindGroupLayout;
  particle1RenderBindGroup: GPUBindGroup;
  particle1RenderPipeline: GPURenderPipeline;

  // Particles (#2: Flammen-Effekt)
  particle2Buffer: GPUBuffer;
  particle2SimParamsBuffer: GPUBuffer;
  particle2SimParamsData: Float32Array;
  particle2SimConfigBuffer: GPUBuffer;
  particle2SimConfigData: Float32Array;
  particle2SimBindGroupLayout: GPUBindGroupLayout;
  particle2SimBindGroup: GPUBindGroup;
  particle2SimPipeline: GPUComputePipeline;
};

const context: GpuContext = {} as GpuContext;
let debounceResizeTimeout: number | null = null;
let resizeObserver: ResizeObserver;
let lastFrameTime = 0;
let now = 0;

async function initializeWebGPU(): Promise<GpuContext> {
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported in this browser.");
  }

  const canvas = document.getElementById("canvas");
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Canvas element not found.");
  }

  const adapter = await navigator.gpu.requestAdapter({
    featureLevel: "core",
    forceFallbackAdapter: false,
    // powerPreference: "high-performance",
    xrCompatible: false,
  });

  if (!adapter) {
    throw new Error("Failed to get GPU adapter.");
  }

  if (adapter.info.isFallbackAdapter) {
    throw new Error("The GPU adapter is a fallback adapter. WebGPU might not be fully supported on this device.");
  }

  const device = await adapter.requestDevice({
    label: "GPU Device",
    requiredFeatures: [
      "float32-blendable",
      "float32-filterable",
      "indirect-first-instance",
      "bgra8unorm-storage",
    ],
    requiredLimits: {
      maxBufferSize: 268435456,
      maxStorageBufferBindingSize: 268435456,
      maxColorAttachments: 4, // Aktuell nutze ich nur ein Color Attachment
      maxColorAttachmentBytesPerSample: 128, // Chrome schafft 128, aber Firefox nur 32 Bytes
      maxTextureDimension1D: 1024,
      maxTextureDimension2D: 4096,
      maxTextureDimension3D: 256,
      maxTextureArrayLayers: 1024,
      maxVertexBuffers: 4,
      minStorageBufferOffsetAlignment: 256,
      minUniformBufferOffsetAlignment: 256,
      maxInterStageShaderVariables: 16,
      maxSampledTexturesPerShaderStage: 8,
      maxSamplersPerShaderStage: 8,
      maxStorageBuffersPerShaderStage: 8,
      maxStorageTexturesPerShaderStage: 4,
      maxUniformBuffersPerShaderStage: 4,
    },
    defaultQueue: {
      label: "Default GPU Queue",
    },
  });

  // Log some nice information about the adapter and device to the console.
  const { info: { architecture, vendor } } = adapter;
  const { features, limits: { maxBufferSize, maxStorageBufferBindingSize, maxTextureDimension2D } } = device;
  const limits = [
    `maxBufferSize: ${humanReadableSize(maxBufferSize)}`,
    `maxStorageBufferBindingSize: ${humanReadableSize(maxStorageBufferBindingSize)}`,
    `maxTextureDimension2D: ${maxTextureDimension2D}`,
  ];

  console.log(`Adapter Info: ${vendor} ${architecture}`);
  console.log(`Features:\n- ${[...features].join("\n- ")}`);
  console.log(`Limits:\n- ${limits.join("\n- ")}`);

  // Ich weiß, dass hier nicht das gesamte Context-Objekt initialisiert wird.
  // Die fehlenden Felder werden in ihren eigenen Funktionen initialisiert.
  const gpuContext = {
    hasValidSize: false,

    canvas,
    adapter,
    device,
  } as GpuContext;

  resizeObserver = new ResizeObserver(resizeHandler);
  resizeObserver.observe(canvas);

  return gpuContext;
}

function initializeSamplers() {
  const nearestSampler = context.device.createSampler({
    label: "Nearest Sampler",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    addressModeW: "clamp-to-edge",
    magFilter: "nearest",
    minFilter: "nearest",
    mipmapFilter: "nearest",
    maxAnisotropy: 1,
  });

  const linearSampler = context.device.createSampler({
    label: "Linear Sampler",
    addressModeU: "repeat",
    addressModeV: "repeat",
    addressModeW: "repeat",
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    maxAnisotropy: 4,
  });

  return {
    nearestSampler,
    linearSampler,
  };
}

function initializeViewProjectionMatrix() {
  const eyePosition = new Vector3();
  const targetPosition = new Vector3();
  const upDirection = new Vector3(0, 1, 0);
  const viewMatrix = new Matrix4();
  const projectionMatrix = new Matrix4();

  const viewProjectionMatrixData = new Float32Array(32); // Platz für 2 4x4 Matrizen (View und Projection)

  const viewProjectionMatrixBuffer = context.device.createBuffer({
    label: "View-Projection Matrix Buffer",
    size: viewProjectionMatrixData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: false,
  });

  const viewProjectionMatrixBindGroupLayout = context.device.createBindGroupLayout({
    label: "View-Projection Matrix Bind Group Layout",
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
      buffer: {
        type: "uniform",
        hasDynamicOffset: false,
        minBindingSize: viewProjectionMatrixData.byteLength,
      },
    }],
  });

  const viewProjectionMatrixBindGroup = context.device.createBindGroup({
    label: "View-Projection Matrix Bind Group",
    layout: viewProjectionMatrixBindGroupLayout,
    entries: [{
      binding: 0,
      resource: {
        buffer: viewProjectionMatrixBuffer,
        offset: 0,
        size: viewProjectionMatrixData.byteLength,
      },
    }],
  });

  return {
    eyePosition,
    targetPosition,
    upDirection,
    viewMatrix,
    projectionMatrix,

    viewProjectionMatrixData,
    viewProjectionMatrixBuffer,
    viewProjectionMatrixBindGroupLayout,
    viewProjectionMatrixBindGroup,
  };
}

async function initializeFloor() {
  const floorShaderModule = context.device.createShaderModule({
    label: "Floor Shader Module",
    code: floorModule,
  });
  await validateShaderModule(floorShaderModule);

  const gridExtent = 500;
  const gridSpacing = 10;
  const linesPerAxis = (gridExtent * 2 / gridSpacing) + 1;
  const linesCount = linesPerAxis * 2;
  const floorVertexCount = linesCount * 2;

  const floatCount = floorVertexCount * 8;
  const floorGridVertexData = new Float32Array(floatCount);

  let vertexOffset = 0;
  for (let i = -gridExtent; i <= gridExtent; i += gridSpacing) {
    let colorValue = 0.25; // Ein dunkleres Grau für die meisten Linien.
    if (i % (gridSpacing * 10) === 0) {
      colorValue = 0.5; // Ein helleres Grau für jede 10. Linie.
    }

    // Linie parallel zur Z-Achse
    floorGridVertexData[vertexOffset + 0x0] = i; // Linie erster Vertex, Position.x
    floorGridVertexData[vertexOffset + 0x1] = 0; // Linie erster Vertex, Position.y (immer 0)
    floorGridVertexData[vertexOffset + 0x2] = -gridExtent; // Linie erster Vertex, Position.z
    floorGridVertexData[vertexOffset + 0x3] = 0; // Linie erster Vertex, Padding
    floorGridVertexData[vertexOffset + 0x4] = (i === 0) ? 0.0 : colorValue; // Linie erster Vertex, Farbe.r
    floorGridVertexData[vertexOffset + 0x5] = (i === 0) ? 0.0 : colorValue; // Linie erster Vertex, Farbe.g
    floorGridVertexData[vertexOffset + 0x6] = (i === 0) ? 1.0 : colorValue; // Linie erster Vertex, Farbe.b (Linie auf der Z-Achse blau färben)
    floorGridVertexData[vertexOffset + 0x7] = 1.0; // Linie erster Vertex, Farbe.a

    floorGridVertexData[vertexOffset + 0x8] = i; // Linie zweiter Vertex, Position.x
    floorGridVertexData[vertexOffset + 0x9] = 0; // Linie zweiter Vertex, Position.y (immer 0)
    floorGridVertexData[vertexOffset + 0xa] = gridExtent; // Linie zweiter Vertex, Position.z
    floorGridVertexData[vertexOffset + 0xb] = 0; // Linie zweiter Vertex, Padding
    floorGridVertexData[vertexOffset + 0xc] = (i === 0) ? 0.0 : colorValue; // Linie zweiter Vertex, Farbe.r
    floorGridVertexData[vertexOffset + 0xd] = (i === 0) ? 0.0 : colorValue; // Linie zweiter Vertex, Farbe.g
    floorGridVertexData[vertexOffset + 0xe] = (i === 0) ? 1.0 : colorValue; // Linie zweiter Vertex, Farbe.b (Linie auf der Z-Achse blau färben)
    floorGridVertexData[vertexOffset + 0xf] = 1.0; // Linie zweiter Vertex, Farbe.a

    vertexOffset += 0x10;

    // Linie parallel zur X-Achse
    floorGridVertexData[vertexOffset + 0x0] = -gridExtent; // Linie erster Vertex, Position.x
    floorGridVertexData[vertexOffset + 0x1] = 0; // Linie erster Vertex, Position.y (immer 0)
    floorGridVertexData[vertexOffset + 0x2] = i; // Linie erster Vertex, Position.z
    floorGridVertexData[vertexOffset + 0x3] = 0; // Linie erster Vertex, Padding
    floorGridVertexData[vertexOffset + 0x4] = (i === 0) ? 1.0 : colorValue; // Linie erster Vertex, Farbe.r (Linie auf der X-Achse rot färben)
    floorGridVertexData[vertexOffset + 0x5] = (i === 0) ? 0.0 : colorValue; // Linie erster Vertex, Farbe.g
    floorGridVertexData[vertexOffset + 0x6] = (i === 0) ? 0.0 : colorValue; // Linie erster Vertex, Farbe.b
    floorGridVertexData[vertexOffset + 0x7] = 1.0; // Linie erster Vertex, Farbe.a

    floorGridVertexData[vertexOffset + 0x8] = gridExtent; // Linie zweiter Vertex, Position.x
    floorGridVertexData[vertexOffset + 0x9] = 0; // Linie zweiter Vertex, Position.y (immer 0)
    floorGridVertexData[vertexOffset + 0xa] = i; // Linie zweiter Vertex, Position.z
    floorGridVertexData[vertexOffset + 0xb] = 0; // Linie zweiter Vertex, Padding
    floorGridVertexData[vertexOffset + 0xc] = (i === 0) ? 1.0 : colorValue; // Linie zweiter Vertex, Farbe.r (Linie auf der X-Achse rot färben)
    floorGridVertexData[vertexOffset + 0xd] = (i === 0) ? 0.0 : colorValue; // Linie zweiter Vertex, Farbe.g
    floorGridVertexData[vertexOffset + 0xe] = (i === 0) ? 0.0 : colorValue; // Linie zweiter Vertex, Farbe.b
    floorGridVertexData[vertexOffset + 0xf] = 1.0; // Linie zweiter Vertex, Farbe.a

    vertexOffset += 0x10;
  }

  const floorVertexBuffer = context.device.createBuffer({
    label: "Floor Vertex Buffer",
    size: floorGridVertexData.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });

  const mapping = new Float32Array(floorVertexBuffer.getMappedRange());
  mapping.set(floorGridVertexData);
  floorVertexBuffer.unmap();

  const floorVertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 32, // 8 floats pro Vertex * 4 bytes pro float
    stepMode: "vertex",
    attributes: [{
      shaderLocation: 0, // Position
      offset: 0,
      format: "float32x3",
    }, {
      shaderLocation: 1, // Farbe
      offset: 16,
      format: "float32x4",
    }],
  };

  const floorLayout = context.device.createPipelineLayout({
    label: "Floor Pipeline Layout",
    bindGroupLayouts: [
      context.viewProjectionMatrixBindGroupLayout,
    ],
  });

  const floorPipeline = context.device.createRenderPipeline({
    label: "Floor Render Pipeline",
    layout: floorLayout,
    vertex: {
      module: floorShaderModule,
      entryPoint: "vs",
      buffers: [floorVertexBufferLayout],
    },
    fragment: {
      module: floorShaderModule,
      entryPoint: "fs",
      targets: [{
        format: navigator.gpu.getPreferredCanvasFormat(),
        blend: {
          color: {
            srcFactor: "one",
            dstFactor: "zero",
            operation: "add",
          },
          alpha: {
            srcFactor: "one",
            dstFactor: "zero",
            operation: "add",
          },
        },
      }],
    },
    primitive: {
      topology: "line-list",
      cullMode: "none",
    },
    depthStencil: {
      format: "depth32float",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
    multisample: {
      count: 1,
    },
  });

  return {
    floorShaderModule,
    floorVertexCount,
    floorVertexBuffer,
    floorPipeline,
  };
}

async function initializeParticles1() {
  // --- Partikel-Buffer erstellen (Storage) ---
  // Jeder Partikel: position(vec3) + age(f32) + velocity(vec3) + lifetime(f32) = 8 floats = 32 bytes
  const particle1ByteSize = 32;
  const particle1BufferSize = PARTICLE_1_COUNT * particle1ByteSize;

  const particle1Buffer = context.device.createBuffer({
    label: "Particle 1 Buffer",
    size: particle1BufferSize,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });

  // Alle Partikel als "tot" initialisieren (age >= lifetime), damit der Compute-Shader sie spawnt
  const particle1Data = new Float32Array(particle1Buffer.getMappedRange());
  for (let i = 0; i < PARTICLE_1_COUNT; i++) {
    const offset = i * 8;
    particle1Data[offset + 0] = 0; // position.x
    particle1Data[offset + 1] = 0; // position.y
    particle1Data[offset + 2] = 0; // position.z
    particle1Data[offset + 3] = 999; // age (hoch, damit sofort respawnt wird)
    particle1Data[offset + 4] = 0; // velocity.x
    particle1Data[offset + 5] = 0; // velocity.y
    particle1Data[offset + 6] = 0; // velocity.z
    particle1Data[offset + 7] = 0; // lifetime (kleiner als age → tot)
  }
  particle1Buffer.unmap();

  // --- SimParams Uniform-Buffer ---
  // deltaTime(f32) + time(f32) + seed(u32) + particleCount(u32) = 16 bytes
  const particle1SimParamsData = new Float32Array(4);
  const particle1SimParamsBuffer = context.device.createBuffer({
    label: "Particle 1 Sim Params Buffer",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // --- Compute Pipeline (Simulation) ---
  const simShaderModule = context.device.createShaderModule({
    label: "Particle 1 Sim Shader Module",
    code: particleSimModule,
  });
  await validateShaderModule(simShaderModule);

  const particle1SimBindGroupLayout = context.device.createBindGroupLayout({
    label: "Particle 1 Sim Bind Group Layout",
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: "uniform",
        hasDynamicOffset: false,
        minBindingSize: particle1SimParamsData.byteLength,
      },
    }, {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: "storage",
        hasDynamicOffset: false,
        minBindingSize: particle1BufferSize,
      },
    }],
  });

  const particle1SimBindGroup = context.device.createBindGroup({
    label: "Particle 1 Sim Bind Group",
    layout: particle1SimBindGroupLayout,
    entries: [{
      binding: 0,
      resource: {
        buffer: particle1SimParamsBuffer,
        offset: 0,
        size: particle1SimParamsData.byteLength,
      },
    }, {
      binding: 1,
      resource: {
        buffer: particle1Buffer,
        offset: 0,
        size: particle1BufferSize,
      },
    }],
  });

  const simPipelineLayout = context.device.createPipelineLayout({
    label: "Particle 1 Sim Pipeline Layout",
    bindGroupLayouts: [particle1SimBindGroupLayout],
  });

  const particle1SimPipeline = context.device.createComputePipeline({
    label: "Particle 1 Sim Compute Pipeline",
    layout: simPipelineLayout,
    compute: {
      module: simShaderModule,
      entryPoint: "simulate",
    },
  });

  // --- Render Pipeline (Partikel zeichnen) ---
  const renderShaderModule = context.device.createShaderModule({
    label: "Particle 1 Render Shader Module",
    code: particleRenderModule,
  });
  await validateShaderModule(renderShaderModule);

  const particle1RenderBindGroupLayout = context.device.createBindGroupLayout({
    label: "Particle 1 Render Bind Group Layout",
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: {
        type: "read-only-storage",
        hasDynamicOffset: false,
        minBindingSize: particle1BufferSize,
      },
    }],
  });

  const particle1RenderBindGroup = context.device.createBindGroup({
    label: "Particle 1 Render Bind Group",
    layout: particle1RenderBindGroupLayout,
    entries: [{
      binding: 0,
      resource: {
        buffer: particle1Buffer,
        offset: 0,
        size: particle1BufferSize,
      },
    }],
  });

  const renderPipelineLayout = context.device.createPipelineLayout({
    label: "Particle 1 Render Pipeline Layout",
    bindGroupLayouts: [
      context.viewProjectionMatrixBindGroupLayout, // group(0)
      particle1RenderBindGroupLayout,               // group(1)
    ],
  });

  const particle1RenderPipeline = context.device.createRenderPipeline({
    label: "Particle 1 Render Pipeline",
    layout: renderPipelineLayout,
    vertex: {
      module: renderShaderModule,
      entryPoint: "vs",
      buffers: [], // Keine Vertex-Buffer, alles über Storage-Buffer + Instancing
    },
    fragment: {
      module: renderShaderModule,
      entryPoint: "fs",
      targets: [{
        format: navigator.gpu.getPreferredCanvasFormat(),
        blend: {
          // Additives Blending für einen leuchtenden Effekt
          color: {
            srcFactor: "src-alpha",
            dstFactor: "one",
            operation: "add",
          },
          alpha: {
            srcFactor: "one",
            dstFactor: "one",
            operation: "add",
          },
        },
      }],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "none",
    },
    depthStencil: {
      format: "depth32float",
      depthWriteEnabled: false, // Transparente Partikel schreiben nicht in den Depth-Buffer
      depthCompare: "less",
    },
    multisample: {
      count: 1,
    },
  });

  return {
    particle1Buffer,
    particle1SimParamsBuffer,
    particle1SimParamsData,
    particle1SimBindGroupLayout,
    particle1SimBindGroup,
    particle1SimPipeline,
    particle1RenderBindGroupLayout,
    particle1RenderBindGroup,
    particle1RenderPipeline,
  };
}

async function initializeParticles2() {
  // --- Partikel-Buffer erstellen (Storage) ---
  // Jeder Partikel: position(vec3) + age(f32) + velocity(vec3) + lifetime(f32) = 8 floats = 32 bytes
  const particle2ByteSize = 32;
  const particle2BufferSize = PARTICLE_2_COUNT * particle2ByteSize;

  const particle2Buffer = context.device.createBuffer({
    label: "Particle 2 Buffer",
    size: particle2BufferSize,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });

  // Alle Partikel als "tot" initialisieren (age >= lifetime), damit der Compute-Shader sie spawnt
  const particle2Data = new Float32Array(particle2Buffer.getMappedRange());
  for (let i = 0; i < PARTICLE_2_COUNT; i++) {
    const offset = i * 8;
    particle2Data[offset + 0] = 0; // position.x
    particle2Data[offset + 1] = 0; // position.y
    particle2Data[offset + 2] = 0; // position.z
    particle2Data[offset + 3] = 999; // age (hoch, damit sofort respawnt wird)
    particle2Data[offset + 4] = 0; // velocity.x
    particle2Data[offset + 5] = 0; // velocity.y
    particle2Data[offset + 6] = 0; // velocity.z
    particle2Data[offset + 7] = 0; // lifetime (kleiner als age → tot)
  }
  particle2Buffer.unmap();

  // --- SimParams Uniform-Buffer ---
  // deltaTime(f32) + time(f32) + seed(u32) + particleCount(u32) = 16 bytes
  const particle2SimParamsData = new Float32Array(4);
  const particle2SimParamsBuffer = context.device.createBuffer({
    label: "Particle 2 Sim Params Buffer",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // --- SimConfig Uniform-Buffer ---
  // buoyancy(f32) + drag(f32) + spawnRadius(f32) + spawnHeight(f32) = 16 bytes
  const particle2SimConfigData = new Float32Array(4);
  const particle2SimConfigBuffer = context.device.createBuffer({
    label: "Particle 2 Sim Config Buffer",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  particle2SimConfigData[0] = 45.0; // buoyancy
  particle2SimConfigData[1] = 2.5; // drag
  particle2SimConfigData[2] = 1.5; // spawnRadius
  particle2SimConfigData[3] = 0.5; // spawnHeight

  const simConfigMapping = new Float32Array(particle2SimConfigBuffer.getMappedRange());
  simConfigMapping.set(particle2SimConfigData);
  particle2SimConfigBuffer.unmap();

  // --- Compute Pipeline (Simulation) ---
  const simShaderModule = context.device.createShaderModule({
    label: "Particle 2 Sim Shader Module",
    code: campfireFlameSimModule,
  });
  await validateShaderModule(simShaderModule);

  const particle2SimBindGroupLayout = context.device.createBindGroupLayout({
    label: "Particle 2 Sim Bind Group Layout",
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: "uniform",
        hasDynamicOffset: false,
        minBindingSize: particle2SimParamsData.byteLength,
      },
    }, {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: "storage",
        hasDynamicOffset: false,
        minBindingSize: particle2BufferSize,
      },
    }],
  });

  const particle2SimBindGroup = context.device.createBindGroup({
    label: "Particle 2 Sim Bind Group",
    layout: particle2SimBindGroupLayout,
    entries: [{
      binding: 0,
      resource: {
        buffer: particle2SimParamsBuffer,
        offset: 0,
        size: particle2SimParamsData.byteLength,
      },
    }, {
      binding: 1,
      resource: {
        buffer: particle2Buffer,
        offset: 0,
        size: particle2BufferSize,
      },
    }],
  });

  const simPipelineLayout = context.device.createPipelineLayout({
    label: "Particle 2 Sim Pipeline Layout",
    bindGroupLayouts: [particle2SimBindGroupLayout],
  });

  const particle2SimPipeline = context.device.createComputePipeline({
    label: "Particle 2 Sim Compute Pipeline",
    layout: simPipelineLayout,
    compute: {
      module: simShaderModule,
      entryPoint: "simulate",
    },
  });

  return {
    particle2Buffer,
    particle2SimParamsBuffer,
    particle2SimParamsData,
    particle2SimBindGroupLayout,
    particle2SimBindGroup,
    particle2SimPipeline,
  };
}

function resizeHandler(entries: ResizeObserverEntry[]) {
  if (entries.length !== 1 || entries[0].target !== context.canvas) {
    return;
  }

  const canvasEntry = entries[0];
  const size = {
    width: canvasEntry.devicePixelContentBoxSize[0].inlineSize,
    height: canvasEntry.devicePixelContentBoxSize[0].blockSize,
  };

  if (context.depthTexture) {
    context.depthTexture.destroy();
  }

  if (context.canvasContext) {
    context.canvasContext.unconfigure();
    context.canvasContext = null!;
  }

  Object.assign(context, {
    hasValidSize: false,

    canvasContext: null!,

    width: 0,
    height: 0,

    depthTexture: null!,
    depthTextureView: null!,
  });

  if (debounceResizeTimeout !== null) {
    clearTimeout(debounceResizeTimeout);
  }

  debounceResizeTimeout = window.setTimeout(
    (size: { width: number; height: number }) => {
      if (size.width <= 0 || size.height <= 0) {
        return;
      }

      context.canvas.width = size.width;
      context.canvas.height = size.height;

      console.log(`Canvas resized: ${size.width}x${size.height}`);

      // Recreate the depth texture with the new size.
      const depthTextureDescriptor: GPUTextureDescriptor = {
        size: [size.width, size.height],
        format: "depth32float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      };

      const canvasContext = context.canvas.getContext("webgpu");
      if (!canvasContext) {
        throw new Error("Failed to get WebGPU canvas context.");
      }
      canvasContext.configure({
        device: context.device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        colorSpace: "srgb",
        alphaMode: "opaque",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      const depthTexture = context.device.createTexture(depthTextureDescriptor);

      const depthTextureView = depthTexture.createView({
        label: "Depth Texture View",
      });

      Object.assign(context, size, {
        hasValidSize: true,
        depthTexture,
        depthTextureView,
        canvasContext,
      });
    },
    25,
    size,
  );
}

function updateViewProjectionMatrix(_deltaTime: number) {
  const alpha = (now * 0.0034) % 360;
  const beta = (now * 0.0065) % 360;
  const gamma = (now * 0.0051) % 360;

  context.eyePosition.set(
    16 + Math.cos(deg2rad(alpha)) * 75,
    25 + Math.sin(deg2rad(gamma)) * 8,
    120,
  );

  context.targetPosition.set(
    -4,
    5,
    30 + Math.sin(deg2rad(beta)) * 16,
  );

  context.viewMatrix.createCameraLookAtMatrix(
    context.eyePosition,
    context.targetPosition,
    context.upDirection,
  );

  const fov = deg2rad(60);
  const aspect = context.height > 0.01 ? (context.width / context.height) : 16 / 9;
  const near = 0.1;
  const far = 10000;

  const top = near * Math.tan(fov / 2);
  const bottom = -top;
  const right = top * aspect;
  const left = -right;

  context.projectionMatrix.createPerspective(
    left,
    right,
    top,
    bottom,
    near,
    far,
  );

  context.viewProjectionMatrixData[0x00] = context.viewMatrix.m11;
  context.viewProjectionMatrixData[0x01] = context.viewMatrix.m12;
  context.viewProjectionMatrixData[0x02] = context.viewMatrix.m13;
  context.viewProjectionMatrixData[0x03] = context.viewMatrix.m14;

  context.viewProjectionMatrixData[0x04] = context.viewMatrix.m21;
  context.viewProjectionMatrixData[0x05] = context.viewMatrix.m22;
  context.viewProjectionMatrixData[0x06] = context.viewMatrix.m23;
  context.viewProjectionMatrixData[0x07] = context.viewMatrix.m24;

  context.viewProjectionMatrixData[0x08] = context.viewMatrix.m31;
  context.viewProjectionMatrixData[0x09] = context.viewMatrix.m32;
  context.viewProjectionMatrixData[0x0a] = context.viewMatrix.m33;
  context.viewProjectionMatrixData[0x0b] = context.viewMatrix.m34;

  context.viewProjectionMatrixData[0x0c] = context.viewMatrix.m41;
  context.viewProjectionMatrixData[0x0d] = context.viewMatrix.m42;
  context.viewProjectionMatrixData[0x0e] = context.viewMatrix.m43;
  context.viewProjectionMatrixData[0x0f] = context.viewMatrix.m44;

  context.viewProjectionMatrixData[0x10] = context.projectionMatrix.m11;
  context.viewProjectionMatrixData[0x11] = context.projectionMatrix.m12;
  context.viewProjectionMatrixData[0x12] = context.projectionMatrix.m13;
  context.viewProjectionMatrixData[0x13] = context.projectionMatrix.m14;

  context.viewProjectionMatrixData[0x14] = context.projectionMatrix.m21;
  context.viewProjectionMatrixData[0x15] = context.projectionMatrix.m22;
  context.viewProjectionMatrixData[0x16] = context.projectionMatrix.m23;
  context.viewProjectionMatrixData[0x17] = context.projectionMatrix.m24;

  context.viewProjectionMatrixData[0x18] = context.projectionMatrix.m31;
  context.viewProjectionMatrixData[0x19] = context.projectionMatrix.m32;
  context.viewProjectionMatrixData[0x1a] = context.projectionMatrix.m33;
  context.viewProjectionMatrixData[0x1b] = context.projectionMatrix.m34;

  context.viewProjectionMatrixData[0x1c] = context.projectionMatrix.m41;
  context.viewProjectionMatrixData[0x1d] = context.projectionMatrix.m42;
  context.viewProjectionMatrixData[0x1e] = context.projectionMatrix.m43;
  context.viewProjectionMatrixData[0x1f] = context.projectionMatrix.m44;

  context.device.queue.writeBuffer(
    context.viewProjectionMatrixBuffer,
    0,
    context.viewProjectionMatrixData.buffer,
  );
}

function updateParticles(deltaTime: number) {
  // SimParams aktualisieren
  const simParamsView = new DataView(context.particle1SimParamsData.buffer);
  simParamsView.setFloat32(0, deltaTime / 1000, true);   // deltaTime in Sekunden
  simParamsView.setFloat32(4, now / 1000, true);          // time in Sekunden
  simParamsView.setUint32(8, (now * 1000) | 0, true);     // seed (pseudo-random)
  simParamsView.setUint32(12, PARTICLE_1_COUNT, true); // particleCount

  context.device.queue.writeBuffer(
    context.particle1SimParamsBuffer,
    0,
    context.particle1SimParamsData.buffer,
  );
}

function renderFrame() {
  now = performance.now();
  const deltaTime = now - lastFrameTime;
  lastFrameTime = now;

  updateViewProjectionMatrix(deltaTime);
  updateParticles(deltaTime);

  if (!context.hasValidSize) {
    requestAnimationFrame(renderFrame);
    return;
  }

  const commandEncoder = context.device.createCommandEncoder({
    label: "Main Command Encoder",
  });

  // --- Compute Pass: Partikel-Simulation ---
  const computePass = commandEncoder.beginComputePass({
    label: "Particle Sim Compute Pass",
  });
  computePass.setPipeline(context.particle1SimPipeline);
  computePass.setBindGroup(0, context.particle1SimBindGroup);
  computePass.dispatchWorkgroups(Math.ceil(PARTICLE_1_COUNT / 256));
  computePass.end();

  // --- Render Pass: Floor + Partikel ---
  const canvasView = context.canvasContext.getCurrentTexture().createView();

  const renderPass = commandEncoder.beginRenderPass({
    label: "Main Render Pass",
    colorAttachments: [{
      view: canvasView,
      loadOp: "clear",
      clearValue: [0.02, 0.03, 0.08, 1], // Dunkler Hintergrund
      storeOp: "store",
    }],
    depthStencilAttachment: {
      view: context.depthTextureView,
      depthLoadOp: "clear",
      depthClearValue: 1,
      depthStoreOp: "store",
    },
  });

  // Floor zeichnen
  renderPass.setPipeline(context.floorPipeline);
  renderPass.setBindGroup(0, context.viewProjectionMatrixBindGroup);
  renderPass.setVertexBuffer(0, context.floorVertexBuffer);
  renderPass.draw(context.floorVertexCount, 1, 0, 0);

  // Partikel zeichnen (instanced: 6 Vertices pro Quad, N Instanzen)
  renderPass.setPipeline(context.particle1RenderPipeline);
  renderPass.setBindGroup(0, context.viewProjectionMatrixBindGroup);
  renderPass.setBindGroup(1, context.particle1RenderBindGroup);
  renderPass.draw(6, PARTICLE_1_COUNT, 0, 0);

  renderPass.end();

  context.device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(renderFrame);
}

async function main() {
  console.clear();
  window.addEventListener("error", handleGlobalError);
  window.addEventListener("unhandledrejection", handleGlobalError);

  Object.assign(context, await initializeWebGPU());
  Object.assign(context, initializeSamplers());
  Object.assign(context, initializeViewProjectionMatrix());
  Object.assign(context, await initializeFloor());
  Object.assign(context, await initializeParticles1());
  Object.assign(context, await initializeParticles2());

  console.log("WebGPU initialized successfully.");

  lastFrameTime = performance.now();

  // Partikel-System Warmup:
  const warmupSteps = 60; // 6 Sekunden a 0.1s DeltaTime pro Step
  const warmupDeltaTime = 100; // 0.1 Sekunden

  now = lastFrameTime - (warmupSteps * warmupDeltaTime);
  for (let i = 0; i < warmupSteps; i++) {
    now += warmupDeltaTime;
    updateParticles(warmupDeltaTime);

    // Compute Shader manuell ausführen, ohne zu rendern, um das Partikel-System "aufzuwärmen"
    const commandEncoder = context.device.createCommandEncoder({
      label: `Warmup Compute Pass Encoder (Step ${i + 1}/${warmupSteps})`,
    });
    const warmupPass = commandEncoder.beginComputePass({
      label: `Warmup Compute Pass (Step ${i + 1}/${warmupSteps})`,
    });
    warmupPass.setPipeline(context.particle1SimPipeline);
    warmupPass.setBindGroup(0, context.particle1SimBindGroup);
    warmupPass.dispatchWorkgroups(Math.ceil(PARTICLE_1_COUNT / 256));
    warmupPass.end();
    context.device.queue.submit([commandEncoder.finish()]);
  }

  requestAnimationFrame(renderFrame);
}

function handleGlobalError(event: ErrorEvent | PromiseRejectionEvent) {
  const error = unknownToError(
    event instanceof ErrorEvent ? event.error : event.reason,
  );
  console.error("Global error:", error);
  event.preventDefault(); // Prevent the default logging to the console
}

await main();
