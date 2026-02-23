// Partikel-Simulationsshader (Compute)

struct SimParams {
  deltaTime: f32,
  time: f32,
  seed: u32,
  particleCount: u32,
};

struct Particle {
  position: vec3<f32>,
  age: f32,
  velocity: vec3<f32>,
  lifetime: f32,
};

@group(0) @binding(0) var<uniform> params: SimParams;
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

const GRAVITY: f32 = 30.0;

@compute @workgroup_size(256)
fn simulate(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= params.particleCount) {
    return;
  }

  var p = particles[index];

  if (p.age >= p.lifetime) {
    // Partikel ist tot → am Ursprung neu spawnen (Springbrunnen)
    let s = index * 7u + params.seed;

    let angle = randomRange(s, 0.0, 6.28318530718);
    let upSpeed = randomRange(s + 1u, 3.0, 60.0);
    let spread = randomRange(s + 2u, 8.0, 20.0);

    // Version 1: Alle Partikel starten am Ursprung
    // p.position = vec3<f32>(0.0, 0.0, 0.0);

    // Version 2: Partikel starten in einem Ring um den Ursprung
    // let radius = randomRange(s + 4u, 20.0, 25.0);
    // p.position = vec3<f32>(
    //   cos(angle) * radius,
    //   0.0,
    //   sin(angle) * radius,
    // );

    // Version 3: Partikel Starten an einem Punkt im Ring, welcher sich mit der Zeit dreht
    let radius = 30.0;
    let rotationAngle = params.time * 1.57; // Rotation über die Zeit
    p.position = vec3<f32>(
      cos(rotationAngle) * radius,
      0.0,
      sin(rotationAngle) * radius,
    );

    p.velocity = vec3<f32>(
      cos(angle) * spread,
      upSpeed,
      sin(angle) * spread,
    );
    p.age = 0.0;
    p.lifetime = randomRange(s + 3u, 1.5, 6.0);
  } else {
    // Gravitation anwenden
    p.velocity.y -= GRAVITY * params.deltaTime;

    // Position aktualisieren
    p.position += p.velocity * params.deltaTime;

    // Alter erhöhen
    p.age += params.deltaTime;

    // Vom Boden abprallen (einfache Kollision)
    if (p.position.y < 0.0) {
      p.position.y = 0.0;
      p.velocity.y = abs(p.velocity.y) * 0.35;
      p.velocity.x *= 0.5;
      p.velocity.z *= 0.5;
    }
  }

  particles[index] = p;
}
