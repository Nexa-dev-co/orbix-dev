"use client";

import { ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Wraps its children in a magnetic field: when the cursor moves within ~80px of
 * the element, the inner content is pulled toward the pointer via GSAP quickTo,
 * springing back on leave. Disabled on touch / reduced-motion.
 */
export default function MagneticButton({
  children,
  className,
  strength = 0.35,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!fine || prefersReduced) return;

    const xTo = gsap.quickTo(inner, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(inner, "y", { duration: 0.6, ease: "power3.out" });

    const PROXIMITY = 80;

    const onMove = (event: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const relativeX = event.clientX - centerX;
      const relativeY = event.clientY - centerY;

      // Only pull when the cursor is near the button's bounds.
      const near =
        event.clientX > rect.left - PROXIMITY &&
        event.clientX < rect.right + PROXIMITY &&
        event.clientY > rect.top - PROXIMITY &&
        event.clientY < rect.bottom + PROXIMITY;

      if (near) {
        xTo(relativeX * strength);
        yTo(relativeY * strength);
      } else {
        xTo(0);
        yTo(0);
      }
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    window.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);

  return (
    <div ref={wrapRef} className={className} style={{ display: "inline-block" }}>
      <div ref={innerRef} style={{ display: "inline-block", willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}
