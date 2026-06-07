import { useEffect, useRef } from "react";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/<>*#@";

interface TextScrambleOptions {
  /** Delay before the scramble begins, in milliseconds. */
  startDelayMs?: number;
  /** Total scramble duration, in milliseconds. */
  durationMs?: number;
}

const DEFAULT_START_DELAY_MS = 200;
const DEFAULT_DURATION_MS = 900;

/*
  Attach the returned ref to a text element rendered with its final text as
  children (so SSR/no-JS shows real, indexable text). On mount, the characters
  resolve from random glyphs to the final text, locking in left-to-right. The
  target is read from the element's own textContent. Reduced motion = no-op.
*/
export function useTextScramble<T extends HTMLElement>(
  options: TextScrambleOptions = {}
) {
  const {
    startDelayMs = DEFAULT_START_DELAY_MS,
    durationMs = DEFAULT_DURATION_MS,
  } = options;
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const finalText = element.textContent ?? "";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion || finalText.length === 0) {
      return;
    }

    let animationFrameId = 0;
    let startTime = 0;

    const step = (now: number) => {
      if (startTime === 0) {
        startTime = now;
      }
      const progress = Math.min((now - startTime) / durationMs, 1);
      const revealedCount = Math.floor(progress * finalText.length);
      let output = "";
      for (let charIndex = 0; charIndex < finalText.length; charIndex += 1) {
        const finalChar = finalText[charIndex];
        if (charIndex < revealedCount || finalChar === " ") {
          output += finalChar;
        } else {
          output += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      }
      element.textContent = output;
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        element.textContent = finalText;
      }
    };

    const startTimerId = window.setTimeout(() => {
      animationFrameId = requestAnimationFrame(step);
    }, startDelayMs);

    return () => {
      window.clearTimeout(startTimerId);
      cancelAnimationFrame(animationFrameId);
      element.textContent = finalText;
    };
  }, [startDelayMs, durationMs]);

  return elementRef;
}
