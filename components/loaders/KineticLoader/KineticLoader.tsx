"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/hooks/useGsap";
import type { LoaderProps } from "../types";

// words that rip through the centre mask before resolving to the brand
const CYCLE = ["WORLDS", "MOTION", "ORBIT", "STORIES", "SIGNAL", "STUDIO"];

/**
 * orbix kinetic-type intro. A giant ghost counter climbs behind a slot-machine
 * of manifesto words that bleed off both edges; they resolve into "orbix" with
 * letters tumbling into place. The exit is an aperture that opens from inside
 * the "o" — a circular portal that expands and reveals the site through the
 * hole. Type-led, no WebGL. Honours reduced motion.
 */
export default function KineticLoader({ onComplete }: LoaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const oRef = useRef<HTMLSpanElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const [count, setCount] = useState(0);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setDims({ w: window.innerWidth, h: window.innerHeight });

    if (prefersReducedMotion()) {
      setCount(100);
      const t = window.setTimeout(onComplete, 600);
      return () => window.clearTimeout(t);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      const prog = { v: 0 };

      // editorial frame + chrome settle in
      tl.from(".k-chrome", { opacity: 0, duration: 0.5, stagger: 0.05 }, 0);
      tl.from(
        ".k-frame",
        { scale: 1.04, opacity: 0, duration: 0.7, ease: "power3.out" },
        0
      );

      // giant ghost counter climbs throughout
      tl.to(
        prog,
        {
          v: 100,
          duration: 1.95,
          ease: "power1.inOut",
          onUpdate: () => setCount(Math.round(prog.v)),
        },
        0.1
      );

      // ── slot-machine word cycle ──
      const cycle = root.current!.querySelector<HTMLElement>(".k-cycle")!;
      CYCLE.forEach((w, i) => {
        const at = 0.15 + i * 0.2;
        const accent = w === "ORBIT";
        tl.add(() => {
          cycle.textContent = w;
          cycle.style.color = accent ? "var(--accent)" : "var(--fg)";
        }, at);
        tl.fromTo(
          ".k-cycle",
          { yPercent: 70, autoAlpha: 0, scaleX: 1.5 - i * 0.05 },
          {
            yPercent: 0,
            autoAlpha: 1,
            scaleX: 1,
            duration: 0.14,
            ease: "power3.out",
          },
          at
        );
        tl.to(
          ".k-cycle",
          { yPercent: -70, autoAlpha: 0, scaleX: 0.6, duration: 0.12, ease: "power3.in" },
          at + 0.16
        );
      });

      // ── resolve into "orbix" ──
      tl.set(".k-cycle-wrap", { autoAlpha: 0 }, ">");
      tl.set(".k-word-wrap", { autoAlpha: 1 });
      tl.from(
        ".k-letter",
        {
          yPercent: 140,
          rotation: () => gsap.utils.random(-35, 35),
          scale: 0.4,
          autoAlpha: 0,
          duration: 0.9,
          ease: "back.out(1.7)",
          stagger: { each: 0.08, from: "center" },
        },
        ">-0.05"
      );
      tl.fromTo(
        ".k-underline",
        { scaleX: 0 },
        { scaleX: 1, duration: 0.7, ease: "power3.inOut" },
        ">-0.4"
      );

      // gentle float while it holds
      gsap.to(".k-word", {
        y: -6,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 2.2,
      });

      // ── aperture exit: portal opens from inside the "o" ──
      tl.add(() => {
        const r = oRef.current?.getBoundingClientRect();
        const v = veil.current;
        if (!r || !v) return;
        const ox = r.left + r.width / 2;
        const oy = r.top + r.height / 2;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const maxR = Math.hypot(
          Math.max(ox, w - ox),
          Math.max(oy, h - oy)
        );
        v.style.setProperty("--ox", `${ox}px`);
        v.style.setProperty("--oy", `${oy}px`);

        gsap.to(v, {
          duration: 1.1,
          ease: "power2.inOut",
          "--r": `${maxR + 4}px`,
        });
        if (ring.current) {
          gsap.set(ring.current, { attr: { cx: ox, cy: oy } });
          gsap.fromTo(
            ring.current,
            { attr: { r: 4 }, opacity: 0.9 },
            {
              attr: { r: maxR },
              opacity: 0,
              duration: 1.1,
              ease: "power2.out",
            }
          );
        }
      }, ">+0.45");

      // fade the whole overlay out right as the portal finishes
      tl.to(root.current, { autoAlpha: 0, duration: 0.4 }, ">+0.65");
    }, root);

    return () => ctx.revert();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maskVal =
    "radial-gradient(circle at var(--ox) var(--oy), transparent var(--r), #000 calc(var(--r) + 2px))";

  return (
    <div
      ref={root}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        color: "var(--fg)",
        overflow: "hidden",
      }}
    >
      {/* masked veil — the aperture punches a growing hole in this */}
      <div
        ref={veil}
        className="k-veil"
        style={
          {
            position: "absolute",
            inset: 0,
            background: "var(--bg)",
            WebkitMaskImage: maskVal,
            maskImage: maskVal,
            "--r": "0px",
            "--ox": "50%",
            "--oy": "50%",
          } as React.CSSProperties
        }
      >
        {/* hairline editorial frame */}
        <div
          className="k-frame"
          style={{
            position: "absolute",
            inset: "clamp(0.9rem, 2.5vw, 1.6rem)",
            border: "1px solid var(--border)",
            pointerEvents: "none",
          }}
        />

        {/* corner chrome */}
        <div
          className="k-chrome eyebrow"
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 4vw, 2.6rem)",
            left: "clamp(1.6rem, 4vw, 2.6rem)",
            color: "var(--muted)",
          }}
        >
          orbix™
        </div>
        <div
          className="k-chrome eyebrow"
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 4vw, 2.6rem)",
            right: "clamp(1.6rem, 4vw, 2.6rem)",
            color: "var(--muted)",
          }}
        >
          ©2026
        </div>
        <div
          className="k-chrome eyebrow"
          style={{
            position: "absolute",
            bottom: "clamp(1.6rem, 4vw, 2.6rem)",
            left: "clamp(1.6rem, 4vw, 2.6rem)",
            color: "var(--muted)",
          }}
        >
          Entering orbit
        </div>

        {/* giant ghost counter */}
        <div
          className="font-display"
          style={{
            position: "absolute",
            right: "clamp(0.5rem, 3vw, 3rem)",
            bottom: "-0.18em",
            fontWeight: 800,
            fontSize: "clamp(8rem, 32vw, 26rem)",
            lineHeight: 0.8,
            color: "color-mix(in srgb, var(--fg) 5%, transparent)",
            letterSpacing: "-0.04em",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {count}
        </div>

        {/* centre stage: cycle words → orbix */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* slot-machine words (bleed off edges) */}
          <div
            className="k-cycle-wrap line-mask"
            style={{ position: "absolute", width: "100%", textAlign: "center" }}
          >
            <span
              className="k-cycle font-display"
              style={{
                display: "inline-block",
                fontWeight: 800,
                fontSize: "clamp(4rem, 17vw, 16rem)",
                lineHeight: 1,
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
              }}
            >
              WORLDS
            </span>
          </div>

          {/* resolved wordmark */}
          <div
            className="k-word-wrap"
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.1rem",
              opacity: 0,
            }}
          >
            <div className="line-mask">
              <span
                className="k-word font-display"
                style={{
                  display: "flex",
                  fontWeight: 800,
                  fontSize: "clamp(3.5rem, 15vw, 12rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                }}
              >
                {"orbix".split("").map((ch, i) => (
                  <span
                    key={i}
                    ref={ch === "o" ? oRef : undefined}
                    className="k-letter"
                    style={{
                      display: "inline-block",
                      color: ch === "i" ? "var(--accent)" : "inherit",
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </span>
            </div>
            <div
              className="k-underline"
              style={{
                width: "min(40vw, 280px)",
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, var(--accent), transparent)",
                transform: "scaleX(0)",
              }}
            />
          </div>
        </div>
      </div>

      {/* accent ring riding the aperture edge (above the veil, not masked) */}
      <svg
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        preserveAspectRatio="none"
      >
        <circle
          ref={ring}
          cx={dims.w / 2}
          cy={dims.h / 2}
          r={0}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          opacity="0"
        />
      </svg>
    </div>
  );
}
