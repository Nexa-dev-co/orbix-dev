// Procedural plasma-star shaders for the shared hero sun. The surface is built
// entirely from noise (no texture map) so it stays razor-sharp when the intro
// flies it from the loader "o" and the scroll expansion blows it up to fill the
// hero — a bitmap would smear at that scale, procedural plasma never does.

export const SUN_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;

  void main() {
    // Local position drives the noise so the plasma pattern is "painted onto"
    // the sphere and rotates with it, rather than swimming in screen space.
    vLocalPosition = position;

    vViewNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDirection = normalize(-viewPosition.xyz);

    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const SUN_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;

  uniform float uTime;
  uniform vec3  uColorCore;   // white-hot brightest granules
  uniform vec3  uColorMid;    // electric-cyan plasma body
  uniform vec3  uColorDeep;   // deep-blue convection troughs
  uniform float uNoiseScale;  // size of the convection cells
  uniform float uFlowSpeed;   // how fast the surface boils
  uniform float uContrast;    // granulation contrast

  // ── Convection / churn tuning ──────────────────────────────────────
  const int   FBM_OCTAVES        = 5;
  const float FBM_INITIAL_AMP    = 0.5;
  const float FBM_LACUNARITY     = 2.0;
  const float FBM_GAIN           = 0.5;
  const float WARP_FREQUENCY     = 1.6;   // domain-warp scale — makes plasma swirl
  const float WARP_STRENGTH      = 0.35;

  // ── Colour ramp thresholds ─────────────────────────────────────────
  const float HEAT_DEEP_EDGE     = 0.05;
  const float HEAT_MID_EDGE      = 0.55;

  // ── Surface flares (bright active regions) ─────────────────────────
  const float FLARE_FREQUENCY    = 2.1;
  const float FLARE_SHARPNESS    = 3.0;
  const float FLARE_INTENSITY    = 0.6;

  // ── Limb darkening + chromosphere rim (fresnel against the camera) ──
  const float LIMB_DARKEN_FLOOR  = 0.45;  // how dark the edge gets
  const float LIMB_DARKEN_POWER  = 2.0;
  const float RIM_POWER          = 3.5;
  const float RIM_INTENSITY      = 0.9;

  // ── Ashima Arts 3D simplex noise (webgl-noise, MIT) ────────────────
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
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
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float fbm(vec3 point) {
    float total = 0.0;
    float amplitude = FBM_INITIAL_AMP;
    for (int octave = 0; octave < FBM_OCTAVES; octave++) {
      total += snoise(point) * amplitude;
      point *= FBM_LACUNARITY;
      amplitude *= FBM_GAIN;
    }
    return total;
  }

  void main() {
    vec3 spherePoint = normalize(vLocalPosition);
    float flow = uTime * uFlowSpeed;

    // 1. Domain-warp the sample point so the plasma swirls and churns instead of
    //    just scrolling past — this is what reads as turbulent convection.
    vec3 sampleCoord = spherePoint * uNoiseScale;
    float warp = snoise(sampleCoord * WARP_FREQUENCY + vec3(0.0, 0.0, flow));
    vec3 churned = sampleCoord + warp * WARP_STRENGTH;

    // 2. Granulation — layered noise gives the boiling convection cells.
    float granulation = fbm(churned + vec3(flow * 0.15, -flow * 0.1, flow * 0.05));
    float heat = clamp(granulation * 0.5 + 0.5, 0.0, 1.0);
    heat = pow(heat, uContrast);

    // 3. Surface flares — sharp, faster-moving hot spots layered over the body.
    float flarePattern = fbm(churned * FLARE_FREQUENCY - vec3(flow * 0.3));
    float flares = pow(clamp(flarePattern, 0.0, 1.0), FLARE_SHARPNESS);

    // 4. Map heat onto the star's colour ramp: deep trough → cyan body → white-hot.
    vec3 color = mix(uColorDeep, uColorMid, smoothstep(HEAT_DEEP_EDGE, HEAT_MID_EDGE, heat));
    color = mix(color, uColorCore, smoothstep(HEAT_MID_EDGE, 1.0, heat));
    color += uColorCore * flares * FLARE_INTENSITY;

    // 5. Limb darkening, then add a thin hot chromosphere rim back at the edge so
    //    the silhouette glows rather than going flat — fresnel against the camera.
    float fresnel = 1.0 - max(dot(normalize(vViewNormal), normalize(vViewDirection)), 0.0);
    color *= mix(1.0, LIMB_DARKEN_FLOOR, pow(fresnel, LIMB_DARKEN_POWER));
    color += uColorMid * pow(fresnel, RIM_POWER) * RIM_INTENSITY;

    gl_FragColor = vec4(color, 1.0);
  }
`;
