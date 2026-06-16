"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/hooks/useGsap";
import type { LoaderProps } from "./types";

const TARGET = "STUD.IO";
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*<>/";

/**
 * Glitch intro: the wordmark resolves out of a stream of random glyphs,
 * locking in left-to-right, then the panel wipes upward to reveal the site.
 */
export default function ScrambleLoader({ onComplete }: LoaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(TARGET);

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      onComplete();
      return;
    }

    let frame = 0;
    const totalFrames = 38; // ~1.5s at 40ms/frame

    const id = window.setInterval(() => {
      frame += 1;
      const locked = Math.floor((frame / totalFrames) * TARGET.length);
      const next = TARGET.split("")
        .map((ch, i) => {
          if (i < locked || ch === ".") return ch;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setText(next);

      if (frame >= totalFrames) {
        window.clearInterval(id);
        setText(TARGET);
        gsap.to(node, {
          yPercent: -100,
          duration: 1.1,
          ease: "expo.inOut",
          delay: 0.45,
          onComplete,
        });
      }
    }, 40);

    return () => window.clearInterval(id);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <span
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: "clamp(2.5rem, 11vw, 8rem)",
          letterSpacing: "0.04em",
          // fixed-width slot so glyph swaps don't shift the layout
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "pre",
        }}
      >
        {text.split("").map((ch, i) =>
          ch === "." ? (
            <span key={i} style={{ color: "var(--accent)" }}>
              {ch}
            </span>
          ) : (
            <span key={i}>{ch}</span>
          )
        )}
      </span>
    </div>
  );
}
