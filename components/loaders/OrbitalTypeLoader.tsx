"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/hooks/useGsap";
import type { LoaderProps } from "./types";

const C = 500; // svg centre (viewBox 0 0 1000 1000)

/** orbital rings made of flowing words — radius, words, speed (s/rev), dir, type size */
const RINGS = [
  { r: 460, text: "ORBIX · DESIGN · MOTION · ", dur: 9, dir: 1, size: 34, fill: "var(--fg)", op: 0.5 },
  { r: 330, text: "IN ORBIT · WE BUILD WORLDS · ", dur: 6.5, dir: -1, size: 30, fill: "var(--accent)", op: 0.8 },
  { r: 210, text: "STORIES · SIGNAL · STUDIO · ", dur: 4.5, dir: 1, size: 26, fill: "var(--fg)", op: 0.45 },
];

/** Full-ellipse path (circle here; the parent group flattens it into a tilt). */
const circlePath = (r: number) =>
  `M ${C - r} ${C} a ${r} ${r} 0 1 1 ${r * 2} 0 a ${r} ${r} 0 1 1 ${-r * 2} 0`;

/**
 * orbix orbital-type intro. Concentric tilted rings built from flowing words
 * revolve around a glowing core; the disc then spins up and collapses, and the
 * letters of "orbix" swing in from their own orbits to form the wordmark. The
 * exit draws an accent "orbital plane" across centre and splits the screen
 * along it to reveal the site. Type-led, no WebGL. Honours reduced motion.
 */
export default function OrbitalTypeLoader({ onComplete }: LoaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(100);
      const t = window.setTimeout(onComplete, 600);
      return () => window.clearTimeout(t);
    }

    const ctx = gsap.context(() => {
      // continuous orbital flow (infinite, killed on unmount via ctx.revert)
      RINGS.forEach((ring, i) => {
        gsap.to(`.ot-ring-${i}`, {
          rotation: 360 * ring.dir,
          svgOrigin: `${C} ${C}`,
          duration: ring.dur,
          repeat: -1,
          ease: "none",
        });
      });
      gsap.to(".ot-core", {
        scale: 1.4,
        transformOrigin: "center",
        svgOrigin: `${C} ${C}`,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      const tl = gsap.timeline({ onComplete });
      const prog = { v: 0 };

      // entrance: chrome + disc unfold
      tl.from(".ot-chrome", { opacity: 0, duration: 0.5, stagger: 0.05 }, 0);
      tl.from(".ot-frame", { opacity: 0, scale: 1.04, duration: 0.7, ease: "power3.out" }, 0);
      tl.from(
        ".ot-disc",
        { autoAlpha: 0, scale: 1.18, svgOrigin: `${C} ${C}`, duration: 1.0, ease: "expo.out" },
        0
      );
      tl.to(
        prog,
        { v: 100, duration: 1.9, ease: "power1.inOut", onUpdate: () => setCount(Math.round(prog.v)) },
        0.1
      );

      // spin-up then collapse the disc into the core
      tl.to(
        ".ot-disc",
        { rotation: 130, scale: 0.04, autoAlpha: 0, svgOrigin: `${C} ${C}`, duration: 0.8, ease: "power3.in" },
        1.45
      );

      // letters fall out of orbit into the wordmark
      tl.set(".ot-word-wrap", { autoAlpha: 1 }, 1.9);
      tl.from(
        ".ot-letter",
        {
          x: (i: number) => Math.cos((i / 5) * Math.PI * 2 - 0.6) * 200,
          y: (i: number) => Math.sin((i / 5) * Math.PI * 2 - 0.6) * 140,
          rotation: () => gsap.utils.random(-140, 140),
          scale: 0.3,
          autoAlpha: 0,
          duration: 0.95,
          ease: "back.out(1.5)",
          stagger: { each: 0.07, from: "center" },
        },
        1.95
      );
      tl.fromTo(
        ".ot-underline",
        { scaleX: 0 },
        { scaleX: 1, duration: 0.7, ease: "power3.inOut" },
        ">-0.35"
      );

      // gentle hold float
      gsap.to(".ot-word", { y: -6, duration: 1.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.0 });

      // ── exit: orbital plane draws, screen splits along it ──
      tl.to(".ot-stage", { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, ">+0.5");
      tl.fromTo(
        ".ot-line",
        { scaleX: 0, autoAlpha: 1 },
        { scaleX: 1, duration: 0.55, ease: "power3.inOut" },
        "<0.1"
      );
      tl.to(".ot-top", { yPercent: -100, duration: 0.95, ease: "expo.inOut" }, ">-0.05");
      tl.to(".ot-bottom", { yPercent: 100, duration: 0.95, ease: "expo.inOut" }, "<");
      tl.to(".ot-line", { autoAlpha: 0, duration: 0.4 }, "<0.4");
    }, root);

    return () => ctx.revert();
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
        zIndex: 10000,
        color: "var(--fg)",
        overflow: "hidden",
      }}
    >
      {/* split panels (the black backdrop that parts on exit) */}
      <div className="ot-top" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "var(--bg)" }} />
      <div className="ot-bottom" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "var(--bg)" }} />

      {/* stage: everything visual sits above the panels and fades before the split */}
      <div className="ot-stage" style={{ position: "absolute", inset: 0 }}>
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <filter id="ot-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {RINGS.map((ring, i) => (
              <path key={i} id={`ot-path-${i}`} d={circlePath(ring.r)} />
            ))}
          </defs>

          <g className="ot-disc">
            {/* tilt: flatten vertically about centre to read as a disc */}
            <g transform={`translate(${C} ${C}) scale(1 0.46) translate(${-C} ${-C})`}>
              {RINGS.map((ring, i) => (
                <g className={`ot-ring-${i}`} key={i}>
                  <use href={`#ot-path-${i}`} fill="none" stroke="var(--border)" strokeWidth="1" />
                  <text
                    className="font-display"
                    fill={ring.fill}
                    fillOpacity={ring.op}
                    style={{ fontWeight: 700, fontSize: ring.size, letterSpacing: "0.18em" }}
                  >
                    <textPath href={`#ot-path-${i}`}>{ring.text.repeat(10)}</textPath>
                  </text>
                  {/* glowing node riding the ring */}
                  <circle cx={C + ring.r} cy={C} r="5" fill="var(--accent)" filter="url(#ot-glow)" />
                </g>
              ))}
            </g>

            {/* core */}
            <circle className="ot-core" cx={C} cy={C} r="9" fill="var(--accent)" filter="url(#ot-glow)" />
          </g>
        </svg>

        {/* hairline frame + corner chrome */}
        <div
          className="ot-frame"
          style={{ position: "absolute", inset: "clamp(0.9rem, 2.5vw, 1.6rem)", border: "1px solid var(--border)", pointerEvents: "none" }}
        />
        <div className="ot-chrome eyebrow" style={{ position: "absolute", top: "clamp(1.6rem,4vw,2.6rem)", left: "clamp(1.6rem,4vw,2.6rem)", color: "var(--muted)" }}>
          orbix™
        </div>
        <div className="ot-chrome eyebrow" style={{ position: "absolute", top: "clamp(1.6rem,4vw,2.6rem)", right: "clamp(1.6rem,4vw,2.6rem)", color: "var(--muted)" }}>
          ©2026
        </div>
        <div className="ot-chrome eyebrow" style={{ position: "absolute", bottom: "clamp(1.6rem,4vw,2.6rem)", left: "clamp(1.6rem,4vw,2.6rem)", color: "var(--muted)" }}>
          Establishing orbit
        </div>
        <div className="ot-chrome eyebrow" style={{ position: "absolute", bottom: "clamp(1.6rem,4vw,2.6rem)", right: "clamp(1.6rem,4vw,2.6rem)", color: "var(--muted)" }}>
          {String(count).padStart(3, "0")} — 100
        </div>

        {/* wordmark (letters swing in from orbit) */}
        <div
          className="ot-word-wrap"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.1rem",
            opacity: 0,
          }}
        >
          <span
            className="ot-word font-display"
            style={{ display: "flex", fontWeight: 800, fontSize: "clamp(3.5rem, 15vw, 12rem)", lineHeight: 1, letterSpacing: "-0.01em" }}
          >
            {"orbix".split("").map((ch, i) => (
              <span
                key={i}
                className="ot-letter"
                style={{ display: "inline-block", color: ch === "i" ? "var(--accent)" : "inherit" }}
              >
                {ch}
              </span>
            ))}
          </span>
          <div
            className="ot-underline"
            style={{ width: "min(40vw, 280px)", height: 1, background: "linear-gradient(90deg, transparent, var(--accent), transparent)", transform: "scaleX(0)" }}
          />
        </div>
      </div>

      {/* the orbital plane that the screen splits along */}
      <div
        className="ot-line"
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 2,
          marginTop: -1,
          background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
          transform: "scaleX(0)",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
