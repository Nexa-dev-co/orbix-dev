import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';
import { deckIsRevealed } from './useDeckReveal';

// If the visitor stops partway through the hero → deck transition, gently carry them the
// rest of the way so the fleet always lands fully revealed instead of stranded mid-fill.
//
// There's no Lenis instance in this project (the hero runs on native scroll + ScrollTrigger),
// so this is a self-contained rAF tween. It only arms in the last stretch before the deck,
// only after the visitor goes idle, and any manual input cancels it — so it assists without
// hijacking the scroll.
const SNAP_IDLE_MS         = 700;  // wait this long after the visitor stops before assisting
const SNAP_ZONE_VIEWPORTS  = 1.0;  // only magnetise within this many viewports of the deck
const SNAP_DURATION_MS     = 850;
const SNAP_MIN_DISTANCE_PX = 4;    // already there — nothing to do

export function useDeckSnap() {
  useEffect(() => {
    // Auto-scrolling is itself motion — respect the reduced-motion preference.
    if (prefersReducedMotion()) return;

    let idleTimer = 0;
    let rafId = 0;
    let isSnapping = false;

    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    const cancelSnap = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      isSnapping = false;
    };

    const smoothScrollTo = (target: number) => {
      const start     = window.scrollY;
      const distance  = target - start;
      const startTime = performance.now();
      isSnapping = true;

      const step = (now: number) => {
        const progress = Math.min((now - startTime) / SNAP_DURATION_MS, 1);
        // easeInOutCubic — settles softly so the fill + reveal don't snap to a stop.
        const eased =
          progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        window.scrollTo(0, start + distance * eased);
        if (progress < 1 && isSnapping) {
          rafId = requestAnimationFrame(step);
        } else {
          cancelSnap();
        }
      };
      rafId = requestAnimationFrame(step);
    };

    const maybeSnap = () => {
      if (isSnapping || deckIsRevealed()) return;
      const target    = maxScroll();
      const current   = window.scrollY;
      const zoneStart = target - window.innerHeight * SNAP_ZONE_VIEWPORTS;
      if (current >= zoneStart && current < target - SNAP_MIN_DISTANCE_PX) {
        smoothScrollTo(target);
      }
    };

    const handleScroll = () => {
      if (deckIsRevealed()) return;
      window.clearTimeout(idleTimer);
      // Don't re-arm while our own tween is driving the scroll.
      if (!isSnapping) idleTimer = window.setTimeout(maybeSnap, SNAP_IDLE_MS);
    };

    // Any manual scroll intent overrides the assist immediately.
    const handleUserInput = () => {
      if (isSnapping) cancelSnap();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleUserInput, { passive: true });
    window.addEventListener('touchstart', handleUserInput, { passive: true });
    window.addEventListener('keydown', handleUserInput);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleUserInput);
      window.removeEventListener('touchstart', handleUserInput);
      window.removeEventListener('keydown', handleUserInput);
      window.clearTimeout(idleTimer);
      cancelSnap();
    };
  }, []);
}
