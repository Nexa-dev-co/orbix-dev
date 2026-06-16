"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

/**
 * Returns true when the user has requested reduced motion. Used by every
 * section to bail out of decorative timelines.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Helper for scoped GSAP work. Provides a scope ref to attach to a section's
 * root element plus a `useGSAP` runner that is automatically scoped to that
 * ref. Every animation created inside the callback is reverted on cleanup
 * (component unmount / dependency change), which also kills any ScrollTriggers
 * created within the scope — no manual teardown required.
 *
 * Usage:
 *   const { scope, useScopedGsap } = useGsap<HTMLElement>();
 *   useScopedGsap(() => { gsap.from(".thing", { ... }); });
 *   return <section ref={scope}> ... </section>;
 */
export function useGsap<T extends HTMLElement = HTMLDivElement>() {
  const scope = useRef<T>(null);

  const useScopedGsap = (
    callback: () => void,
    dependencies: unknown[] = []
  ) => {
    useGSAP(
      () => {
        if (prefersReducedMotion()) return;
        callback();
      },
      { scope, dependencies }
    );
  };

  return { scope, useScopedGsap };
}

export { gsap, ScrollTrigger, useGSAP };
