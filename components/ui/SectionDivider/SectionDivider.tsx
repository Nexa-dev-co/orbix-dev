"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * A hairline rule that wipes across the viewport width as it scrolls into view,
 * replacing static section borders. Draws once. Under reduced-motion it simply
 * renders at full width.
 */
export default function SectionDivider() {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      gsap.set(line, { scaleX: 1 });
      return;
    }

    let ctx: gsap.Context | undefined;
    const timer = setTimeout(() => {
      ctx = gsap.context(() => {
        gsap.to(line, {
          scaleX: 1,
          duration: 1.4,
          ease: "power3.inOut",
          scrollTrigger: {
            trigger: line,
            start: "top 90%",
            once: true,
          },
        });
        ScrollTrigger.refresh();
      }, lineRef);
    }, 100);

    return () => {
      clearTimeout(timer);
      ctx?.revert();
    };
  }, []);

  return (
    <div
      ref={lineRef}
      aria-hidden
      style={{
        height: "0.5px",
        width: "100%",
        background: "var(--border)",
        transform: "scaleX(0)",
        transformOrigin: "left",
      }}
    />
  );
}
