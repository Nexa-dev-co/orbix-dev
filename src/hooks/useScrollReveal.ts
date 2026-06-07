import { useEffect, useRef } from "react";
import { registerGsap, gsap } from "@/lib/gsap-config";

interface ScrollRevealOptions {
  /** Stagger between revealed children, in seconds. */
  stagger?: number;
  /** Vertical travel distance for the reveal, in pixels. */
  travelDistance?: number;
}

const DEFAULT_STAGGER_SECONDS = 0.12;
const DEFAULT_TRAVEL_DISTANCE = 40;

/*
  Attach the returned ref to a section; any descendant marked [data-reveal] fades
  and rises into place when the section scrolls into view. Centralizes scroll
  reveals on GSAP ScrollTrigger (per Animation Philosophy) instead of manual
  IntersectionObservers. Respects prefers-reduced-motion.
*/
export function useScrollReveal<T extends HTMLElement>(
  options: ScrollRevealOptions = {}
) {
  const {
    stagger = DEFAULT_STAGGER_SECONDS,
    travelDistance = DEFAULT_TRAVEL_DISTANCE,
  } = options;
  const containerRef = useRef<T>(null);

  useEffect(() => {
    registerGsap();
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      return;
    }

    // gsap.context scopes the selector to this container and gives us a single
    // revert() that cleans up the tween and its ScrollTrigger on unmount.
    const context = gsap.context(() => {
      gsap.from("[data-reveal]", {
        opacity: 0,
        y: travelDistance,
        duration: 0.9,
        ease: "expo.out",
        stagger,
        scrollTrigger: {
          trigger: container,
          start: "top 80%",
        },
      });
    }, container);

    return () => context.revert();
  }, [stagger, travelDistance]);

  return containerRef;
}
