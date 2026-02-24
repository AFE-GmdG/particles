// Lagerfeur-Flammen-Simulationsshader (Compute)

struct SimConfig {
  deltaTime: f32,
  time: f32,
  seed: u32,
  particleCount: u32,
  buoyancy: f32,      // 45.0 m/s²
  drag: f32,          // 2.5
  spawnRadius: f32,   // 1.5
  spawnHeight: f32,   // 0.5
};

struct Particle {
  position: vec3<f32>,
  age: f32,
  velocity: vec3<f32>,
  lifetime: f32,
};

@group(0) @binding(0) var<uniform> config: SimConfig;
@group(0) @binding(1) var<storage, read_write> particles: array<Particle>;

// Pseudo-Zufallszahl basierend auf einem Seed (Hash-Funktion)
fn hash(seed: u32) -> u32 {
  var s = seed;
  s = s ^ (s >> 16u);
  s = s * 0x45d9f3bu;
  s = s ^ (s >> 16u);
  s = s * 0x45d9f3bu;
  s = s ^ (s >> 16u);
  return s;
}

fn randomFloat(seed: u32) -> f32 {
  return f32(hash(seed)) / 4294967295.0;
}

// Erzeugt eine Zufallszahl im Bereich [min, max]
fn randomRange(seed: u32, minVal: f32, maxVal: f32) -> f32 {
  return minVal + randomFloat(seed) * (maxVal - minVal);
}

@compute @workgroup_size(256)
fn simulate(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= config.particleCount) {
    return;
  }

  var particle = particles[index];

  if (particle.age >= particle.lifetime) {
    // Partikel ist tot → am Ursprung in Spawnzone neu spawnen
    let seed = index * 11u + config.seed;

    // Zylindisches Spawnmuster: Zufälliger Punkt in Kreis mit Radius SPAWN_RADIUS
    let spawnAngle = randomRange(seed, 0.0, 6.28318530718);
    let spawnDist = randomRange(seed + 1u, 0.0, config.spawnRadius);

    particle.position = vec3<f32>(
      cos(spawnAngle) * spawnDist,
      config.spawnHeight,
      sin(spawnAngle) * spawnDist,
    );

    // Initiale Geschwindigkeit: Starke Aufwärtskomponente + kleine horizontale Streuung
    let upwardSpeed = randomRange(seed + 2u, 20.0, 80.0);
    let horizontalSpread = randomRange(seed + 3u, 2.0, 8.0);
    let spreadAngle = randomRange(seed + 4u, 0.0, 6.28318530718);

    particle.velocity = vec3<f32>(
      cos(spreadAngle) * horizontalSpread,
      upwardSpeed,
      sin(spreadAngle) * horizontalSpread,
    );

    particle.age = 0.0;
    particle.lifetime = randomRange(seed + 5u, 0.5, 1.0);
  } else {
    // Auftrieb anwenden (Flammen steigen auf)
    particle.velocity.y += config.buoyancy * config.deltaTime;

    // Luftwiderstand anwenden (Geschwindigkeit wird über Zeit gedämpft)
    particle.velocity *= (1.0 - config.drag * config.deltaTime);

    // Position aktualisieren
    particle.position += particle.velocity * config.deltaTime;

    // Alter erhöhen
    particle.age += config.deltaTime;
  }

  particles[index] = particle;
}
