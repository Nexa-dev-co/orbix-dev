/*
  Text → pixels utilities shared by the wordmark loading variants. Two outputs:
  a silhouette canvas (used as a GPU mask) and a set of normalized sample points
  (used as particle targets). Both need real glyphs, so callers must
  `await document.fonts.ready` first.
*/

/*
  next/font generates a hashed @font-face family name (e.g. "__Syne_abc123") and
  exposes it only via a CSS variable. Canvas 2D needs a concrete family string,
  so we resolve the variable through getComputedStyle and append a fallback.
*/
export function resolveDisplayFontFamily(): string {
  const probe = document.createElement("span");
  probe.style.fontFamily = "var(--font-syne)";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).fontFamily;
  document.body.removeChild(probe);
  return resolved && resolved !== "var(--font-syne)"
    ? `${resolved}, sans-serif`
    : "sans-serif";
}

interface WordCanvasOptions {
  text: string;
  width: number;
  height: number;
  /** Glyph cap-height as a fraction of canvas height. */
  fontFraction?: number;
}

/*
  Draws white text centered on a black canvas — used directly as a Three.js
  texture where the red/luminance channel is the letter mask.
*/
export function createWordCanvas({
  text,
  width,
  height,
  fontFraction = 0.42,
}: WordCanvasOptions): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return canvas;
  }

  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const fontFamily = resolveDisplayFontFamily();
  let fontSize = Math.round(height * fontFraction);
  context.font = `800 ${fontSize}px ${fontFamily}`;

  // Auto-fit: shrink the glyphs if they'd overflow, so the wordmark is never
  // clipped (a clipped "A" was why NEXA didn't read).
  const maxWidth = width * 0.82;
  const measuredWidth = context.measureText(text).width;
  if (measuredWidth > maxWidth) {
    fontSize = Math.floor((fontSize * maxWidth) / measuredWidth);
    context.font = `800 ${fontSize}px ${fontFamily}`;
  }

  context.fillText(text, width / 2, height / 2 + fontSize * 0.02);

  return canvas;
}

export interface WordPoints {
  /** Flat [x0, y0, x1, y1, ...] normalized so y ∈ [-0.5, 0.5], x scaled by aspect. */
  positions: Float32Array;
  count: number;
}

interface SampleWordPointsOptions {
  text: string;
  /** Roughly how many points to return; actual count varies with glyph coverage. */
  approximateCount?: number;
}

/*
  Samples the filled pixels of the rendered word into normalized 2D points.
  Aspect ratio is baked into x so callers can multiply both axes by one world
  scale and keep the letters undistorted.
*/
export function sampleWordPoints({
  text,
  approximateCount = 700,
}: SampleWordPointsOptions): WordPoints {
  const SAMPLE_WIDTH = 640;
  const SAMPLE_HEIGHT = 320;
  const canvas = createWordCanvas({
    text,
    width: SAMPLE_WIDTH,
    height: SAMPLE_HEIGHT,
    fontFraction: 0.55,
  });
  const context = canvas.getContext("2d");
  if (!context) {
    return { positions: new Float32Array(0), count: 0 };
  }

  const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  const aspect = SAMPLE_WIDTH / SAMPLE_HEIGHT;

  // First pass: collect every lit pixel, then thin to ~approximateCount.
  const litPixels: number[] = [];
  for (let pixelY = 0; pixelY < SAMPLE_HEIGHT; pixelY += 1) {
    for (let pixelX = 0; pixelX < SAMPLE_WIDTH; pixelX += 1) {
      // Red channel — white text on black, so >128 means "inside a glyph".
      const isLit = data[(pixelY * SAMPLE_WIDTH + pixelX) * 4] > 128;
      if (isLit) {
        litPixels.push(pixelX, pixelY);
      }
    }
  }

  const totalLit = litPixels.length / 2;
  // Probabilistic sampling (not a fixed stride): row-major striding aliases
  // against horizontal features, which dropped the E's three bars while keeping
  // its spine. Per-pixel random inclusion covers thin strokes evenly.
  const keepProbability = Math.min(1, approximateCount / totalLit);
  const positions: number[] = [];
  for (let litIndex = 0; litIndex < totalLit; litIndex += 1) {
    if (Math.random() > keepProbability) {
      continue;
    }
    const pixelX = litPixels[litIndex * 2];
    const pixelY = litPixels[litIndex * 2 + 1];
    const normalizedX = (pixelX / SAMPLE_WIDTH - 0.5) * aspect;
    const normalizedY = 0.5 - pixelY / SAMPLE_HEIGHT;
    positions.push(normalizedX, normalizedY);
  }

  return {
    positions: new Float32Array(positions),
    count: positions.length / 2,
  };
}
