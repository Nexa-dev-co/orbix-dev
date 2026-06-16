"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Initialises a single Lenis smooth-scroll instance and drives it from the
 * GSAP ticker so that ScrollTrigger stays perfectly in sync. Returns nothing —
 * the instance lives for the lifetime of the component it's mounted in
 * (the root layout) and is destroyed on unmount.
 *
 * Respects prefers-reduced-motion: when the user opts out of motion we skip
 * Lenis entirely and fall back to the browser's native scrolling.
 */
export function useLenis() {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      // Still make sure ScrollTrigger is usable with native scroll.
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      lerp: 0.08,
      duration: 1.4,
      smoothWheel: true,
    });

    // Keep ScrollTrigger updated as Lenis scrolls.
    lenis.on("scroll", ScrollTrigger.update);

    // Drive Lenis from GSAP's ticker for a single, synced RAF loop.
    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Recalculate positions once everything is laid out.
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
}
