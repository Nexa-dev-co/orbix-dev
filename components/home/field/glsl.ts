/**
 * GLSL for the particle field. Two simulation passes (velocity, position) run
 * through GPUComputationRenderer ping-pong targets; the render pair draws the
 * whole field as one Points call. `texturePosition` / `textureVelocity`
 * sampler declarations are injected by GPUComputationRenderer — only custom
 * uniforms are declared here.
 */

/** Ashima 3D simplex noise + a cheap curl built from it. */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec3 curl(vec3 p) {
  const float e = 0.12;
  float n1 = snoise(vec3(p.x, p.y + e, p.z));
  float n2 = snoise(vec3(p.x, p.y - e, p.z));
  float n3 = snoise(vec3(p.x, p.y, p.z + e));
  float n4 = snoise(vec3(p.x, p.y, p.z - e));
  float n5 = snoise(vec3(p.x + e, p.y, p.z));
  float n6 = snoise(vec3(p.x - e, p.y, p.z));
  vec3 c = vec3((n1 - n2) - (n3 - n4), (n3 - n4) - (n5 - n6), (n5 - n6) - (n1 - n2));
  return normalize(c + 1e-5);
}
`;

export const VELOCITY_SHADER = /* glsl */ `
uniform float uDelta;
uniform float uTime;
uniform float uMorph;
uniform float uFormless;
uniform float uIntro;
uniform float uShapeScale;
uniform float uHold;
uniform float uBurstAge;
uniform float uTravelMode; // 0 none · 1 pull · 2 formation · 3 streams · 4 docking
uniform float uFlow;       // parked-on-streams circulation
uniform float uCenterZ;    // z of the current focus plane
uniform float uCoreMode;   // final-leg showpiece: 0 none · 1 braid · 2 crystal · 3 warp
uniform float uCoreInfall; // primary core-transition force, 0..1
uniform float uCoreEvent;  // punctuation event, 0..1 (coil-in / lattice lock / membrane punch)
uniform vec3 uPointer;
uniform vec3 uBurstPos;
uniform sampler2D uTargetA;
uniform sampler2D uTargetB;

${NOISE}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 pos = texture2D(texturePosition, uv).xyz;
  vec3 vel = texture2D(textureVelocity, uv).xyz;

  vec4 a = texture2D(uTargetA, uv);
  vec4 b = texture2D(uTargetB, uv);
  vec3 target = mix(a.xyz, b.xyz, uMorph);
  target.xy *= uShapeScale;
  float home = mix(a.w, b.w, uMorph);

  // Intro: the whole field is compressed into a seed at the origin, then the
  // tween of uIntro -> 0 lets it bloom outward into the first formation.
  target = mix(target, vec3(0.0), uIntro);
  home = max(home, uIntro);

  // Spring toward home — slackened while the field is in transit between stops
  float k = mix(0.6, 5.0, home) * (1.0 - uFormless * 0.8);
  vel += (target - pos) * k * uDelta;

  // Organic drift; free particles and mid-travel particles ride the flow
  float amp = mix(14.0, 2.2, home) + uFormless * 20.0;
  vel += curl(pos * 0.05 + uTime * 0.05) * amp * uDelta;

  // ── travel manoeuvres: each leg of the journey is its own transition ──
  vec3 rel = pos - vec3(0.0, 0.0, uCenterZ);
  float rl = max(length(rel.xy), 0.0001);
  vec3 radial = vec3(rel.xy / rl, 0.0);
  vec3 tang = vec3(-rel.y / rl, rel.x / rl, 0.0);

  if (uTravelMode > 0.5 && uFormless > 0.001) {
    float F = uFormless;
    if (uTravelMode < 1.5) {
      // gravitational pull: the next destination spins the field into a vortex
      vel += (tang * 30.0 - radial * 6.0) * F * uDelta;
    } else if (uTravelMode < 2.5) {
      // planet formation: scatter on departure, accrete hard on arrival
      vel += radial * (0.5 - uMorph) * 90.0 * F * uDelta;
    } else if (uTravelMode < 3.5) {
      // stream navigation: a lateral surge the camera banks through
      vel += vec3(38.0, sin(pos.z * 0.3 + uTime * 2.0) * 10.0, 0.0) * F * uDelta;
    } else {
      // docking: a slow inward spiral toward the core
      vel += (tang * 14.0 - radial * 10.0) * F * uDelta;
    }
  }

  // ── final-leg showpiece (streams → core): three switchable identities ──
  // The generic manoeuvre is off on this leg (uTravelMode = 0) so the active
  // variant fully owns the motion. uCoreInfall is the primary force; uCoreEvent
  // is the punctuating beat. Variant chosen by ?transition= (see config.ts).
  vec3 centre = vec3(0.0, 0.0, uCenterZ);
  if (uCoreMode > 0.5 && uCoreInfall > 0.001) {
    float F = uCoreInfall;
    if (uCoreMode < 1.5) {
      // BRAID: converge onto a thin thread around the axis while twisting; the
      // twist phase varies with depth so the four streams read as weaving into
      // one. radial pulls onto the tube, tang twists it.
      float threadR = mix(9.0, 0.8, F);
      vel += -radial * (rl - threadR) * 6.0 * F * uDelta;
      float phase = rel.z * 0.28 + uTime * 1.6;
      vel += tang * (16.0 + sin(phase) * 18.0) * F * uDelta;
    } else if (uCoreMode < 2.5) {
      // CRYSTAL: supercooled → ordered. A fast shimmer agitates the field as it
      // nears the lattice (a liquid about to crystallize), then drains out as F
      // rises so the gem visibly *stills* and seats — energy ordering into
      // structure rather than just fading in.
      float shimmer = (1.0 - F) * 7.0;
      vel += curl(pos * 0.5 + uTime * 3.0) * shimmer * uDelta;
      vel -= vel * F * 6.0 * uDelta;
    } else {
      // WARP: stretch into a tunnel — drive along -z (into the screen) and a
      // little outward so particles streak past the flying camera.
      vel += vec3(0.0, 0.0, -1.0) * 64.0 * F * uDelta;
      vel += radial * 7.0 * F * uDelta;
    }
  }
  if (uCoreEvent > 0.001) {
    float E = uCoreEvent;
    if (uCoreMode < 1.5) {
      // braid resolve: the thread coils inward into the core
      vel += -radial * E * 46.0 * uDelta;
    } else if (uCoreMode < 2.5) {
      // crystal lock: the lattice seizes — a hard pull onto the exact gem
      // positions plus a clamp, so the facets click into place crisply (a
      // decisive snap, not a soft settle). target is the gem (top of main).
      vel += (target - pos) * E * 26.0 * uDelta;
      vel -= vel * E * 10.0 * uDelta;
    } else {
      // warp membrane punch: the sheet detonates outward as the camera breaks in
      vec3 fromCentre = pos - centre;
      float dCentre = max(length(fromCentre), 0.0001);
      vel += (fromCentre / dCentre) * E * 230.0 * uDelta;
    }
  }

  // Parked on the data streams: signals keep circulating along the loops
  vel += tang * uFlow * home * 26.0 * uDelta;

  // Cursor mass: gentle swirl + push at rest…
  vec3 toP = uPointer - pos;
  float d = max(length(toP), 0.0001);
  vec3 dir = toP / d;
  float near = exp(-d * d * 0.012);
  vec3 tangent = normalize(cross(dir, vec3(0.0, 0.0, 1.0)) + 1e-5);
  vel += (tangent * 60.0 - dir * 38.0) * near * uDelta * (1.0 - uHold);

  // …and a black hole while held: long-range pull that swallows speed
  float grip = uHold * uHold;
  vel += dir * grip * 340.0 * exp(-d * 0.045) * uDelta;
  vel -= vel * grip * near * 0.6;

  // Release shockwave: an expanding gaussian band of outward impulse
  const float life = 1.1;
  if (uBurstAge < life) {
    float r = uBurstAge * 90.0;
    vec3 fromB = pos - uBurstPos;
    float bd = max(length(fromB), 0.0001);
    float band = exp(-pow(bd - r, 2.0) * 0.02);
    vel += (fromB / bd) * band * (1.0 - uBurstAge / life) * 460.0 * uDelta;
  }

  // Frame-rate-independent damping; formation particles settle harder
  vel *= pow(0.9, uDelta * 60.0 * (1.0 + home));

  gl_FragColor = vec4(vel, 1.0);
}
`;

export const POSITION_SHADER = /* glsl */ `
uniform float uDelta;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec3 v = texture2D(textureVelocity, uv).xyz;
  gl_FragColor = vec4(p.xyz + v * uDelta, p.w);
}
`;

export const POINT_VERT = /* glsl */ `
uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform float uSize;
uniform float uPixelRatio;
attribute float aLabel;
varying float vSpeed;
varying float vSeed;
varying float vDepth;
varying float vLabel;
varying float vGlint;

void main() {
  vec4 p = texture2D(texturePosition, position.xy);
  vec3 v = texture2D(textureVelocity, position.xy).xyz;
  vSpeed = length(v);
  vSeed = p.w;
  vLabel = aLabel;
  // diagonal coordinate (gem is centred at x=y=0) for the crystal glint sweep
  vGlint = (p.x + p.y) * 0.7;

  vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
  vDepth = -mv.z;
  gl_PointSize = uSize * uPixelRatio * (0.5 + fract(vSeed * 13.7)) * (52.0 / max(vDepth, 1.0));
  gl_Position = projectionMatrix * mv;
}
`;

export const POINT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uOpacity;
uniform float uHoverMix;
uniform float uCrystalGlint; // 0 inactive · 0→1 sweeps a refraction band across the gem
varying float vSpeed;
varying float vSeed;
varying float vDepth;
varying float vLabel;
varying float vGlint;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.08, d);

  // Fast particles flash the accent; a rare few are permanent embers
  float heat = smoothstep(8.0, 40.0, vSpeed) * 0.9 + step(0.992, fract(vSeed * 91.3)) * 0.55;
  vec3 col = mix(uColor, uAccent, min(heat, 1.0));

  // Hover-planet label: the name particles glow accent and brighten so they
  // read as a label across the white planet behind them.
  float label = vLabel * uHoverMix;
  col = mix(col, uAccent, label);
  alpha *= 1.0 + label * 0.6;

  // Crystal refraction glint: as the lattice locks, a bright accent band sweeps
  // diagonally across the facets (uCrystalGlint travels 0→1), fading in and out.
  if (uCrystalGlint > 0.001) {
    float sweep = uCrystalGlint * 48.0 - 24.0;
    float band = exp(-pow(vGlint - sweep, 2.0) * 0.05);
    float intensity = sin(uCrystalGlint * 3.14159265);
    col = mix(col, uAccent, band * intensity);
    alpha *= 1.0 + band * intensity * 1.4;
  }

  // Depth fade keeps far formations as faint constellations, not noise
  float fog = smoothstep(150.0, 36.0, vDepth) * 0.92 + 0.08;

  gl_FragColor = vec4(col, alpha * uOpacity * fog);
}
`;
