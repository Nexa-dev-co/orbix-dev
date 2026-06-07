export interface GrainOverlayController {
  stop: () => void;
}

// Backing store stays tiny; CSS stretches it to fill, so the grain is cheap to
// regenerate every frame regardless of viewport size.
const NOISE_TEXTURE_SIZE = 128;
// Throttle to ~24fps — film grain reads better slightly slower than display
// refresh, and it halves the per-frame cost.
const FRAME_INTERVAL_MS = 1000 / 24;

const NOOP_CONTROLLER: GrainOverlayController = { stop: () => {} };

/*
  Animated monochrome noise drawn into a canvas — the subtle grain texture the
  loading screen opens on (Nexa tweak: grain is visible for the first 200ms
  before Lottie appears, so the open feels intentional, not a splash).
*/
export function startGrainOverlay(canvas: HTMLCanvasElement): GrainOverlayController {
  const renderingContext = canvas.getContext("2d");
  if (!renderingContext) {
    return NOOP_CONTROLLER;
  }

  canvas.width = NOISE_TEXTURE_SIZE;
  canvas.height = NOISE_TEXTURE_SIZE;

  const noiseImage = renderingContext.createImageData(
    NOISE_TEXTURE_SIZE,
    NOISE_TEXTURE_SIZE
  );
  const pixels = noiseImage.data;

  let animationFrameId = 0;
  let lastDrawTime = 0;

  const drawNoiseFrame = (time: number) => {
    animationFrameId = requestAnimationFrame(drawNoiseFrame);
    if (time - lastDrawTime < FRAME_INTERVAL_MS) {
      return;
    }
    lastDrawTime = time;

    for (let pixelIndex = 0; pixelIndex < pixels.length; pixelIndex += 4) {
      const brightness = (Math.random() * 255) | 0;
      pixels[pixelIndex] = brightness;
      pixels[pixelIndex + 1] = brightness;
      pixels[pixelIndex + 2] = brightness;
      pixels[pixelIndex + 3] = 255;
    }
    renderingContext.putImageData(noiseImage, 0, 0);
  };

  animationFrameId = requestAnimationFrame(drawNoiseFrame);

  return {
    stop: () => cancelAnimationFrame(animationFrameId),
  };
}
