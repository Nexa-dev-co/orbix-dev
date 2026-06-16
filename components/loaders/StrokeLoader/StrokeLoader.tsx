"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/hooks/useGsap";
import type { LoaderProps } from "../types";

const R = 92;
const CIRC = 2 * Math.PI * R;

/**
 * An accent ring draws itself around the wordmark while the mark eases in; once
 * the circle closes, the whole thing scales up a touch and fades to reveal the
 * site.
 */
export default function StrokeLoader({ onComplete }: LoaderProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        onComplete();
        return;
      }

      const tl = gsap.timeline({ onComplete });

      tl.fromTo(
        ".sl-ring",
        { strokeDashoffset: CIRC },
        { strokeDashoffset: 0, duration: 1.7, ease: "power2.inOut" }
      );
      tl.fromTo(
        ".sl-mark",
        { autoAlpha: 0, scale: 0.9 },
        { autoAlpha: 1, scale: 1, duration: 1, ease: "expo.out" },
        0.2
      );
      tl.to(
        root.current,
        { autoAlpha: 0, scale: 1.06, duration: 0.7, ease: "power2.inOut" },
        "+=0.35"
      );
    },
    { scope: root }
  );

  return (
    <div
      ref={root}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transformOrigin: "center",
      }}
    >
      <div style={{ position: "relative", width: 220, height: 220 }}>
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
        >
          <circle
            cx="110"
            cy="110"
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
          />
          <circle
            className="sl-ring"
            cx="110"
            cy="110"
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC}
          />
        </svg>

        <div
          className="sl-mark font-display"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "1.6rem",
            letterSpacing: "0.05em",
            color: "var(--fg)",
            opacity: 0,
          }}
        >
          orb<span style={{ color: "var(--accent)" }}>i</span>x
        </div>
      </div>
    </div>
  );
}
