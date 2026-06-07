/*
  GLSL for the loading iris reveal.

  Deviation from CLAUDE.md's reference shader: the spec samples a `uScene`
  texture (a render of the page) and zoom/barrel-distorts it. Capturing the
  live DOM into a WebGL texture requires html2canvas and is brittle, so instead
  this iris reveals the real DOM *through alpha* — the fragment paints opaque
  black, then the iris opens to transparent and the actual page (behind the
  canvas) shows through. The Nexa cyan accent pulse and edge feather/wobble are
  preserved faithfully.

  Uniforms:
  - uLoaded:      0 → 1, drives iris radius (GSAP-animated)
  - uAccentPulse: 0 → 1, peaks early then fades — the cyan glow ring
  - uResolution:  canvas pixel size, for aspect-correct circular iris
*/

// Full-screen quad: a PlaneGeometry(2, 2) already spans clip space, so we skip
// the camera entirely and pass position straight through.
export const irisVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const irisFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uLoaded;
  uniform float uAccentPulse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  #define PI 3.14159265358979
  #define ACCENT_COLOR vec3(0.0, 0.898, 1.0) // #00e5ff

  void main() {
    vec2 centeredUv = vUv - 0.5;
    // Correct for aspect ratio so the iris is a true circle, not an ellipse.
    centeredUv.x *= uResolution.x / uResolution.y;
    float distanceFromCenter = length(centeredUv);

    // Iris radius grows past 1.0 so it clears the corners by uLoaded = 1.
    float irisRadius = uLoaded * 1.25;
    // Edge softens as it expands — a hard ring early, a gentle wash late.
    float edgeFeather = 0.04 + uLoaded * 0.12;

    // Organic wobble on the expanding edge (stand-in for the spec's barrel
    // distortion), damped to zero as the reveal finishes so it settles clean.
    float angle = atan(centeredUv.y, centeredUv.x);
    float edgeWobble = sin(angle * 3.0 + uLoaded * PI) * 0.012 * (1.0 - uLoaded);
    float maskedDistance = distanceFromCenter + edgeWobble;

    // coverage: 1 = opaque black (page hidden), 0 = transparent (page revealed).
    float coverage = smoothstep(
      irisRadius - edgeFeather,
      irisRadius + edgeFeather,
      maskedDistance
    );

    // Cyan glow concentrated on the reveal edge — the accent pulse "emanates
    // from the center" as the iris opens, then fades with uAccentPulse.
    float edgeProximity = smoothstep(edgeFeather * 2.0, 0.0, abs(maskedDistance - irisRadius));
    vec3 accentGlow = ACCENT_COLOR * edgeProximity * uAccentPulse * 0.9;

    // Covered region is black; the glow ring tints both sides of the edge so a
    // faint cyan halo reads against the freshly revealed page.
    float alpha = max(coverage, edgeProximity * uAccentPulse * 0.6);
    gl_FragColor = vec4(accentGlow, alpha);
  }
`;
