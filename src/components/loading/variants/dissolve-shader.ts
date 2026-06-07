/*
  Flow-noise dissolve, with a wordmark intro: a pen sweeps left→right writing
  NEXA onto the black overlay (uWrite 0→1), then the black erodes along a noise
  threshold (uProgress 0→1), leaving an organic liquid edge with a cyan glow
  front and revealing the page through alpha. The letters erode away too.
*/
export const dissolveVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const dissolveFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uProgress;
  uniform float uAccentPulse;
  uniform float uWrite;      // 0→1 intro: pen sweeps left→right writing NEXA
  uniform sampler2D uMask;   // white-on-black NEXA silhouette
  varying vec2 vUv;

  #define ACCENT_COLOR vec3(0.0, 0.898, 1.0) // #00e5ff

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Value noise — cheap, smooth, good enough for a dissolve mask.
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

  void main() {
    // Intro wordmark: a pen writes NEXA left→right. Letters appear as the
    // writing front (writeFront) passes their x position; a bright tip rides it.
    float mask = texture2D(uMask, vUv).r;
    float writeFront = mix(0.12, 0.88, uWrite);
    float written = smoothstep(writeFront, writeFront - 0.02, vUv.x);
    float letter = mask * written;
    vec3 wordColor = ACCENT_COLOR * letter + vec3(1.0) * pow(letter, 3.0) * 0.3;

    // Pen tip — a bright nib glowing where it's currently drawing, faded out as
    // the stroke finishes.
    float penFade = 1.0 - smoothstep(0.96, 1.0, uWrite);
    float pen = smoothstep(0.014, 0.0, abs(vUv.x - writeFront)) * mask * penFade;
    wordColor += (ACCENT_COLOR * 0.6 + vec3(1.0) * 0.4) * pen;

    // Layer two noise scales so the edge isn't a single regular blob.
    float n = valueNoise(vUv * 7.0) * 0.7 + valueNoise(vUv * 18.0) * 0.3;
    // A slight downward bias makes the dissolve sweep top-to-bottom.
    n += (1.0 - vUv.y) * 0.15;

    float threshold = uProgress * 1.3;
    float edge = threshold - n;

    // coverage: 1 = still black, 0 = dissolved (page revealed).
    float coverage = step(edge, 0.0);

    // Bright cyan rim exactly on the dissolve front — gated to the dissolve
    // phase so the intro stays clean (no stray specks while NEXA is showing).
    float dissolveActive = step(0.001, uProgress);
    float front = smoothstep(0.09, 0.0, abs(edge)) * dissolveActive;
    vec3 glow = ACCENT_COLOR * front * uAccentPulse;

    // The word sits on the covered (black) area, so it erodes with the dissolve.
    vec3 color = wordColor * coverage + glow;
    float alpha = max(coverage, front * uAccentPulse * 0.6);
    gl_FragColor = vec4(color, alpha);
  }
`;
