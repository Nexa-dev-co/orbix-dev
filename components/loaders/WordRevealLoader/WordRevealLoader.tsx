"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/hooks/useGsap";
import type { LoaderProps } from "../types";

const WORDS = ["WE", "BUILD", "WORLDS"];

/**
 * Typographic intro: a sequence of brand words rises into a centred mask one at
 * a time, each clearing before the next arrives, then the panel lifts away.
 */
export default function WordRevealLoader({ onComplete }: LoaderProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        onComplete();
        return;
      }

      const tl = gsap.timeline({ onComplete });

      WORDS.forEach((_, i) => {
        const last = i === WORDS.length - 1;
        tl.fromTo(
          `.wr-word-${i}`,
          { yPercent: 110 },
          { yPercent: 0, duration: 0.55, ease: "expo.out" }
        );
        // hold, then clear it out — except the final word, which stays put
        if (!last) {
          tl.to(
            `.wr-word-${i}`,
            { yPercent: -110, duration: 0.5, ease: "expo.in" },
            "+=0.3"
          );
        }
      });

      tl.to(
        root.current,
        { yPercent: -100, duration: 1.1, ease: "expo.inOut" },
        "+=0.45"
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
        color: "var(--fg)",
        zIndex: 10000,
        transformOrigin: "top",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* stacked words share one masked slot in the centre */}
      <div
        className="line-mask font-display"
        style={{
          position: "relative",
          fontWeight: 800,
          fontSize: "clamp(2.5rem, 11vw, 9rem)",
          lineHeight: 1,
        }}
      >
        {/* invisible spacer keeps the mask sized to the widest word */}
        <span style={{ visibility: "hidden" }}>WORLDS</span>
        {WORDS.map((word, i) => (
          <span
            key={word}
            className={`wr-word-${i}`}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "translateY(110%)",
            }}
          >
            {word}
            {i === WORDS.length - 1 && (
              <span style={{ color: "var(--accent)" }}>.</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
