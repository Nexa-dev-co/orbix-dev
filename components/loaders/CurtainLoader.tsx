"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/hooks/useGsap";
import type { LoaderProps } from "./types";

const PANELS = 5;

/**
 * Brand wordmark fades up in the centre, then a row of vertical panels lifts
 * away one after another — like theatre blinds — to uncover the site behind.
 */
export default function CurtainLoader({ onComplete }: LoaderProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        onComplete();
        return;
      }

      const tl = gsap.timeline({ onComplete });

      tl.fromTo(
        ".cu-brand",
        { autoAlpha: 0, letterSpacing: "0.5em", y: 10 },
        { autoAlpha: 1, letterSpacing: "0.18em", y: 0, duration: 0.9, ease: "expo.out" }
      );
      tl.to(".cu-brand", { autoAlpha: 0, duration: 0.4, ease: "power2.in" }, "+=0.5");
      tl.to(
        ".cu-panel",
        {
          yPercent: -100,
          duration: 0.9,
          ease: "expo.inOut",
          stagger: 0.08,
        },
        "-=0.1"
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
        zIndex: 10000,
        pointerEvents: "none",
      }}
    >
      {/* panel row forms the opaque cover */}
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        {Array.from({ length: PANELS }).map((_, i) => (
          <div
            key={i}
            className="cu-panel"
            style={{
              flex: 1,
              background: "var(--bg)",
              borderRight:
                i < PANELS - 1 ? "1px solid rgba(255,255,255,0.02)" : "none",
            }}
          />
        ))}
      </div>

      {/* centred wordmark sits above the panels */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="cu-brand font-display"
          style={{
            fontWeight: 800,
            fontSize: "clamp(2rem, 8vw, 6rem)",
            color: "var(--fg)",
            opacity: 0,
          }}
        >
          STUD<span style={{ color: "var(--accent)" }}>.</span>IO
        </span>
      </div>
    </div>
  );
}
