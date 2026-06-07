/*
  Signal-glitch wordmark shader. The word materializes out of digital noise:
  horizontal bands tear and shift, RGB channels split into chromatic fringes,
  and scanlines roll over it. uProgress settles the glitch into a crisp NEXA;
  uReveal triggers a final band-by-band glitch wipe that reveals the page.
*/
export const glitchVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const glitchFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uProgress;
  uniform float uReveal;
  uniform sampler2D uMask;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Glitch is strong before the word settles, and again during the outro.
    float glitchAmount = (1.0 - uProgress) + uReveal * 1.5;

    // Horizontal tear bands — a subset of bands shift sideways each tick.
    float band = floor(vUv.y * 26.0);
    float bandNoise = hash(vec2(band, floor(uTime * 14.0)));
    float tear = (bandNoise - 0.5) * 0.18 * glitchAmount * step(0.72, bandNoise);
    vec2 glitchedUv = vUv + vec2(tear, 0.0);

    // Chromatic split: sample the mask at offset positions per channel.
    float split = 0.012 * glitchAmount + 0.003;
    float maskRed = texture2D(uMask, glitchedUv + vec2(split, 0.0)).r;
    float maskGreen = texture2D(uMask, glitchedUv).r;
    float maskBlue = texture2D(uMask, glitchedUv - vec2(split, 0.0)).r;

    // Cyan word with red/blue chromatic fringes at the split edges.
    vec3 color = vec3(maskRed * 0.25, maskGreen * 0.9, maskBlue * 1.0);
    // Hot white core as it settles.
    color += vec3(1.0) * maskGreen * pow(uProgress, 2.0) * 0.3;

    // Rolling scanlines.
    color *= 0.82 + 0.18 * sin(vUv.y * uResolution.y * 1.2 + uTime * 18.0);

    // Flicker the whole word while it's still forming.
    float flicker = mix(
      0.55 + 0.45 * step(0.5, hash(vec2(floor(uTime * 22.0), 7.0))),
      1.0,
      uProgress
    );
    color *= flicker;

    // Outro: bands vanish at random reveal thresholds — a glitchy wipe to page.
    float revealNoise = hash(vec2(band, 3.0));
    float covered = 1.0 - step(revealNoise, uReveal);

    gl_FragColor = vec4(color, covered);
  }
`;
