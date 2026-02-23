# Partikelsysteme

## Testanwendung für die Erforschung von Partikelsystemen

Dies ist eine reine Testanwendung. Ich halte hier zwar Linterregeln streng ein und Typescript ist auch auf einem sehr strengen Niveau eingestellt, aber hier gibt es keinerlei Klassensystem, keine Engine oder sonst eine "Architektur". Die Testanwendung befindet sich größtenteils in einer einzigen Datei: [app.ts](./app.ts). Es gibt ein paar Hilfsfunktionen in [common.ts](./common.ts) sowie ein paar Klassen für die Berechnung von [Matrizen](./math/matrix4.ts), [Vektoren](./math/vector3.ts) und [Quaternionen](./math/quaternion.ts), aber das war's auch schon.

Das Ziel dieser Testanwendung ist es, Grundlagen von Partikelsystemen zu verstehen, die Aufteilung von Compute- und Rendershadern sowie die Verwendung der benötigten WebGPU-Resourcen zu skizzieren. In einer konkreten Anwendung können die Codeteile dann in vernünftige Klassen oder Module gekapselt werden; hier ist das nicht nötig.

## Partikelsystem #1: Funkenflug
- Computeshader: [particle_sim.wgsl](./shader/particle_sim.wgsl)
- Rendershader: [particle_render.wgsl](./shader/particle_render.wgsl)

Der erste Partikeleffekt zeigt ein sich im eine Art Funkenspur, wie sie z.B. an einer Zündschnur entstehen könnte. Es werden etwa 8000 Partikel mit einer Lebensdauer von 1-6 Sekunden simuliert. Partikel spawnen an einem Punkt, der sich mit der Zeit um den Ursprung dreht und erzeugen so eine spiralförmige Funkenspur. Jedes Partikel hat eine initiale Aufwärtsgeschwindigkeit sowie einen zufälligen horizontalen Versatz. Sie fallen unter Schwerkraft und prallen vom Boden ab, wobei sie Energie verlieren. Gerendert werden kleine kameraausgerichtete Quads, die ein weiches, kreisförmiges Partikel darstellen. Farbe und Transparenz ändern sich kontinuierlich über die Lebensdauer.

### Partikelstruktur
Ein Partikel besteht aus vier 32-Bit-Werten (32 Byte Speicher pro Partikel):
- `position: vec3<f32>` – Weltposition des Partikels
- `age: f32` – Aktuelles Alter des Partikels in Sekunden
- `velocity: vec3<f32>` – Geschwindigkeitsvektor (m/s)
- `lifetime: f32` – Gesamte Lebenserwartung des Partikels in Sekunden

### Simulationsparameter (Uniform)
Der Compute-Shader erhält folgende Parameter:
- `deltaTime: f32` – Zeit seit dem letzten Frame in Sekunden
- `time: f32` – Gesamtablaufzeit der Anwendung in Sekunden (für zyklische Bewegungen)
- `seed: u32` – Seed für die Zufallszahlengenerierung (variiert pro Frame)
- `particleCount: u32` – Gesamtzahl der zu simulierenden Partikel (8192)

### Simulationsdetails
- **Spawnmuster:** Partikel spawnen an einem einzelnen Punkt, der sich mit der Zeit um den Ursprung dreht (Kreis mit Radius 30 Einheiten). Die Rotationsgeschwindigkeit beträgt `time * 1.57 rad/s`.
- **Initialgeschwindigkeit:**
  - Aufwärts: 3–60 m/s (zufällig pro Partikel)
  - Horizontal-Spread: 8–20 m/s radialer Versatz (zufällig pro Partikel)
- **Lebensdauer:** 1,5–6,0 Sekunden (zufällig pro Partikel)
- **Schwerkraft:** 30 m/s² (konstant, nach unten wirkend)
- **Bodenabprall:** Wenn `position.y < 0` erfolgt ein elastischer Stoß:
  - Vertikale Geschwindigkeit: `abs(velocity.y) * 0.35` (65% Energieverlust)
  - Horizontale Geschwindigkeit: `velocity.x/z *= 0.5` (50% Reibung)
  - Partikel können nach oben hinaus erneut aufspringen

### Rendering
Die Partikel werden als Instanz-gerenderte Billboards dargestellt:
- **Struktur pro Partikel:** Ein Quad aus 6 Vertices (zwei Dreiecke)
- **Größe:**
  - Variable Größe basierend auf Lebensfortschritt: `quadSize = 0.25 + 0.35 * life`
  - Bei Spawn (life = 1.0): Größe 0.60
  - Bei Death (life = 0.0): Größe 0.25
- **Farbverlauf** (von alt zu jung, hexadezimal):
  - Rot (R):   konstant 1.0
  - Grün (G):  0.2 + life * 0.8 (von 0.2 zu 1.0) – Weiß → Gelb
  - Blau (B):  life² * 0.3 (von 0.0 zu 0.3) – Rot → Orange
  - Alpha (A): life * 0.85 (von 0.0 zu 0.85) – Unsichtbar → Sichtbar
- **Form:**
  - Kreisförmiges Partikel durch Distance-Function im Fragment-Shader
  - Weicher Rand durch quadratischen Falloff: `falloff = 1.0 - dist²`
  - Partikel außerhalb des Radius 1.0 werden verworfen
- **Blending:** Additives Blending zur Verstärkung des Glypheffekts

### Rendering-Parameter (Uniform)
- `view: mat4x4<f32>` – View-Matrix (Kamera-Transformation)
- `projection: mat4x4<f32>` – Projektions-Matrix (Perspektive)

## Partikelsystem #2: Lagerfeuer
- Computeshader:
  - [campfire_flame_sim.wgsl](./shader/campfire_flame_sim.wgsl)
  - [campfire_smoke_sim.wgsl](./shader/campfire_smoke_sim.wgsl)
- Rendershader:
  - [campfire_flame_render.wgsl](./shader/campfire_flame_render.wgsl)
  - [campfire_smoke_render.wgsl](./shader/campfire_smoke_render.wgsl)

Der zweite Partikeleffekt soll das Feuer und den Rauch eines Lagerfeuers simulieren. Die Holzscheite sind nicht Teil dieser Testanwendung und werden durch eine simple Geometrie (z.B. eine Box) der Einfachheit halber ersetzt.

### Konzept
Das Lagerfeuer besteht aus zwei verschiedenen Arten von Partikeln:
1. **Flammenpartikel:** Heiße Gase und leuchtende Partikel, die von der Feuerquelle aufsteigen. Sie sind warm gefärbt (orange bis gelb) und werden oben schnell durchsichtig.
2. **Rauchpartikel:** Kühlere, graue Partikel, die sich oben sammeln und nach außen hin auflösen. Sie erscheinen am Anfang dunkler und werden nach oben hin heller und transparenter.

### Simulationsdetails
- **Spawn-Position:** Partikel werden in einem kleinen Bereich über der Feuerquelle (z.B. oberhalb der Holzscheite) gespawnt.
- **Aufstiegsverhalten:** Flammenpartikel steigen schnell auf (nach oben gerichtete Anfangsgeschwindigkeit + Auftrieb), während Rauchpartikel langsamer aufsteigen.
- **Lebensdauer:**
  - Flammenpartikel: 0,5–1,0 Sekunden
  - Rauchpartikel: 3,0–8,0 Sekunden
- **Geschwindigkeit:**
  - Flammenpartikel erhalten eine hohe initiale Aufwärtsgeschwindigkeit und einen zufälligen horizontalen Versatz.
  - Rauchpartikel erhalten eine mäßigere Aufwärtsgeschwindigkeit und streuen seitwärts aus. Dabei steigen Partikel schneller auf, je weiter zentriert sie über dem Feuer sind (Direkt über dem Feuer ist es heißer und damit mehr Auftrieb).
- **Skalierung:** Die Partikelgröße ändert sich über die Lebensdauer, um den Auflösungsprozess zu simulieren.

### Rendering
Die Partikel werden wie beim Funkenflug als kameraausgerichtete Billboards gerendert. Die Textur ist ein berechneter Kreis mit zum Rand hin ansteigenden Transparenzwerten. Ein FBM (Fractal Brownian Motion) könnte den Effekt verbessern aber wir fangen erst einmal einfach an.
- **Flammenpartikel:** Orange bis gelb gefärbt mit weichen Kanten. Der Alpha-Wert sinkt gegen Ende der Lebensdauer.
- **Rauchpartikel:** Grau gefärbt (beginnt dunkelgrau, wird heller). Ebenfalls mit weichen Kanten und sinkendem Alpha-Wert.
- Beide Typen werden additiv über die Szene gelegt, um den Glut- und Raucheffekt zu verstärken.

### Spawnmuster
Die Partikel werden nicht in einem einzigen Punkt gespawnt, sondern in einem kleinen zylindrischen Bereich, um mehr Volumen und Realismus zu erreichen. Das Spawnmuster kann in den Simulationsparametern angepasst werden (z.B. Radius und Höhe der Spawnzone).
