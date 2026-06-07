import Lenis from "lenis";

/*
  Lenis singleton. The whole app shares one inertial-scroll instance so
  ScrollTrigger can stay in sync with it (see SmoothScroller). Creating more
  than one Lenis would fight over the scroll position.
*/
let lenisInstance: Lenis | null = null;

// Lower lerp = heavier, slower-settling inertia. Tuned for a cinematic feel.
const SCROLL_LERP = 0.1;

export function getLenis(): Lenis {
  if (typeof window === "undefined") {
    throw new Error("getLenis() must only be called in the browser.");
  }
  if (!lenisInstance) {
    lenisInstance = new Lenis({ lerp: SCROLL_LERP });
  }
  return lenisInstance;
}

export function destroyLenis(): void {
  lenisInstance?.destroy();
  lenisInstance = null;
}
