/*
  Flow-field wordmark shader. A domain-warped FBM energy field flows across the
  screen in cyan; as uProgress rises, energy outside the letter mask fades while
  energy inside it brightens and sharpens into "NEXA". The outro (uReveal) is a
  flow-driven dissolve that lets the letters linger a beat longer than the rest.

  uMask: white-on-black silhouette of the word, sized to the viewport so vUv
  samples it 1:1 (no aspect correction needed).
*/
export const flowFieldVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const flowFieldFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uProgress;
  uniform float uReveal;
  uniform sampler2D uMask;
  varying vec2 vUv;

  #define ACCENT vec3(0.0, 0.898, 1.0) // #00e5ff

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float total = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 5; octave++) {
      total += valueNoise(p) * amplitude;
      p *= 2.0;
      amplitude *= 0.5;
    }
    return total;
  }

  void main() {
    // Domain warp: offset the sampling point by another FBM for turbulent flow.
    vec2 p = vUv * 3.0;
    vec2 warp = vec2(
      fbm(p + vec2(0.0, uTime * 0.10)),
      fbm(p + vec2(5.2, uTime * 0.12))
    );
    float flow = fbm(p * 1.4 + warp * 2.2 + uTime * 0.15);

    // CanvasTexture already flips Y, so sample vUv directly (no manual flip).
    float mask = texture2D(uMask, vUv).r;

    // Brighter inside the letters; outside energy fades as it settles.
    float field = flow * (0.25 + 0.75 * mask);
    field *= 1.0 - (1.0 - mask) * uProgress * 0.9;
    // Crisp glowing core fills in the letters as the field settles.
    float core = mask * uProgress;
    float intensity = field + core * 0.9;

    vec3 color = ACCENT * intensity + vec3(1.0) * pow(core, 3.0) * 0.4;

    // Outro dissolve — letters (high mask) dissolve last so they linger.
    float dissolveEdge = uReveal * 1.3 - (flow * 0.6 + mask * 0.5);
    float covered = step(dissolveEdge, 0.0);
    float frontGlow =
      smoothstep(0.06, 0.0, abs(dissolveEdge)) * step(0.001, uReveal);
    color += ACCENT * frontGlow * 0.8;

    gl_FragColor = vec4(color, covered);
  }
`;
