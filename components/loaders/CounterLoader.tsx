"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/hooks/useGsap";
import type { LoaderProps } from "./types";

/**
 * Minimal agency counter: a big Syne number ticks 000 → 100 in the corner while
 * a hairline accent bar fills along the bottom. When it lands, the whole panel
 * slides up to reveal the site.
 */
export default function CounterLoader({ onComplete }: LoaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        onComplete();
        return;
      }

      const c = { v: 0 };
      const tl = gsap.timeline({ onComplete });

      tl.to(c, {
        v: 100,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: () => setCount(Math.round(c.v)),
      });
      tl.to(".cl-bar", { scaleX: 1, duration: 2, ease: "power2.inOut" }, 0);
      tl.to(".cl-content", { autoAlpha: 0, duration: 0.4, ease: "power2.in" }, ">-0.15");
      tl.to(root.current, { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, ">-0.1");
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
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "clamp(1.5rem, 4vw, 3rem)",
      }}
    >
      <div className="cl-content" style={{ display: "contents" }}>
        <span className="eyebrow" style={{ color: "var(--muted)" }}>
          STUD.IO — Loading experience
        </span>

        <div
          className="font-display"
          style={{
            alignSelf: "flex-end",
            display: "flex",
            alignItems: "flex-end",
            gap: "0.5rem",
            lineHeight: 0.85,
            fontWeight: 800,
          }}
        >
          <span style={{ fontSize: "clamp(4rem, 18vw, 13rem)" }}>
            {String(count).padStart(3, "0")}
          </span>
          <span
            style={{
              fontSize: "clamp(1rem, 3vw, 2rem)",
              color: "var(--accent)",
              marginBottom: "0.4em",
            }}
          >
            %
          </span>
        </div>
      </div>

      {/* progress track pinned to the very bottom edge */}
      <div
        className="cl-content"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: "var(--border)",
        }}
      >
        <div
          className="cl-bar"
          style={{
            height: "100%",
            background: "var(--accent)",
            transform: "scaleX(0)",
            transformOrigin: "left",
          }}
        />
      </div>
    </div>
  );
}
