"use client";

import { useEffect } from "react";
import { getLenis, destroyLenis } from "@/lib/lenis";
import { registerGsap, gsap, ScrollTrigger } from "@/lib/gsap-config";

interface SmoothScrollerProps {
  children: React.ReactNode;
}

/*
  Wraps the app in Lenis inertial scrolling and keeps GSAP ScrollTrigger in
  sync with it. Lenis drives the scroll position, so ScrollTrigger must be told
  to recompute on every Lenis tick — otherwise scroll-driven reveals would lag
  behind the smoothed position.
*/
export default function SmoothScroller({ children }: SmoothScrollerProps) {
  useEffect(() => {
    registerGsap();

    // Honor reduced-motion: skip the smoothing layer entirely and let the
    // browser scroll natively. ScrollTrigger still works against native scroll.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      return;
    }

    const lenis = getLenis();
    lenis.on("scroll", ScrollTrigger.update);

    // Drive Lenis from GSAP's ticker so both share one RAF loop. gsap.ticker
    // reports seconds; Lenis.raf expects milliseconds.
    const updateLenisOnTick = (timeInSeconds: number) => {
      lenis.raf(timeInSeconds * 1000);
    };
    gsap.ticker.add(updateLenisOnTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenisOnTick);
      destroyLenis();
    };
  }, []);

  return <>{children}</>;
}
