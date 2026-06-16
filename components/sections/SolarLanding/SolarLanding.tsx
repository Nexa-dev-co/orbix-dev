"use client";

import { useEffect, useRef, useState } from "react";

import { PLANETS, SCROLL_VH_PER_SECTION } from "./solarConfig";
import { SolarScene } from "./SolarScene";
import { buildSolarJourney } from "./solarJourney";

/** Scroll container height — hero + one section per planet. */
const SECTION_COUNT = PLANETS.length + 1;

/**
 * Solar-system landing page: a full-viewport WebGL canvas with a blue star
 * and five fictional planets scattered around it. GSAP ScrollTrigger drives
 * a cinematic camera: bird's-eye hero → crane-down → planet-to-planet with sway.
 * Holographic add-on orbiters appear around the active planet.
 */
export default function SolarLanding() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const planetPanelRefs = useRef<HTMLDivElement[]>([]);
  const sceneRef = useRef<SolarScene | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
      return;
    }

    const wrapperElement = wrapperRef.current;
    const canvasElement = canvasRef.current;
    const heroElement = heroRef.current;
    if (!wrapperElement || !canvasElement || !heroElement) return;

    const scene = new SolarScene(canvasElement, PLANETS);
    sceneRef.current = scene;
    scene.start();

    const journey = buildSolarJourney({
      scene,
      trigger: wrapperElement,
      heroPanel: heroElement,
      planetPanels: planetPanelRefs.current,
      onActive: (index) =>
        setActiveIndex((current) => (current === index ? current : index)),
    });

    const handleResize = () => {
      scene.resize();
      journey.scrollTrigger.refresh();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      journey.scrollTrigger.kill();
      journey.timeline.kill();
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sync active index → show/hide holographic add-on orbiters. */
  useEffect(() => {
    sceneRef.current?.setActivePlanet(activeIndex);
  }, [activeIndex]);

  /* ─── Reduced-motion fallback ────────────────────────────────────── */
  if (reducedMotion) {
    return (
      <div style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <section style={reducedHeroStyle}>
          <div style={{ textAlign: "center" }}>
            <span className="eyebrow" style={{ color: "var(--accent)" }}>
              Explore the System
            </span>
            <h1 className="font-display" style={heroTitleStyle}>
              We build worlds
            </h1>
          </div>
        </section>
        {PLANETS.map((planet) => (
          <section key={planet.name} style={reducedSectionStyle}>
            <div style={{ maxWidth: 600, width: "100%" }}>
              <span className="eyebrow" style={{ color: "var(--accent)" }}>
                {planet.kicker}
              </span>
              <h2 className="font-display" style={planetTitleStyle}>
                {planet.title}
              </h2>
              <p style={planetDescriptionStyle}>{planet.description}</p>
            </div>
          </section>
        ))}
      </div>
    );
  }

  /* ─── Full experience ────────────────────────────────────────────── */
  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        height: `${SECTION_COUNT * SCROLL_VH_PER_SECTION}vh`,
        background: "var(--bg)",
      }}
    >
      {/* WebGL canvas — fixed behind everything */}
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      />

      {/* Cinematic vignette overlay */}
      <div style={vignetteStyle} />

      {/* Hero panel — centered, visible on load */}
      <div
        ref={heroRef}
        style={{
          ...fixedPanelBase,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: activeIndex === -1 ? "auto" : "none",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 640 }}>
          <span className="eyebrow" style={{ color: "var(--accent)" }}>
            Explore the System
          </span>
          <h1 className="font-display" style={heroTitleStyle}>
            We build worlds
          </h1>
          <p style={heroSubtitleStyle}>Scroll to explore our orbit</p>
        </div>
      </div>

      {/* Planet section panels — positioned bottom-left so they don't obscure the planet */}
      {PLANETS.map((planet, index) => (
        <div
          key={planet.name}
          ref={(element) => {
            if (element) planetPanelRefs.current[index] = element;
          }}
          style={{
            ...fixedPanelBase,
            display: "flex",
            alignItems: "flex-end",
            padding: "0 clamp(2rem, 6vw, 5rem) clamp(4rem, 10vh, 8rem)",
            opacity: 0,
            pointerEvents: index === activeIndex ? "auto" : "none",
          }}
        >
          <div style={{ maxWidth: 520, width: "100%" }}>
            <span className="eyebrow" style={{ color: "var(--accent)" }}>
              {planet.kicker}
            </span>
            <h2 className="font-display" style={planetTitleStyle}>
              {planet.title}
            </h2>
            <p style={planetDescriptionStyle}>{planet.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/*  Inline styles (co-located, not in CSS)     */
/* ─────────────────────────────────────────── */

const fixedPanelBase: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2,
  color: "var(--fg)",
};

const vignetteStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1,
  pointerEvents: "none",
  background:
    "radial-gradient(circle at 50% 45%, transparent 40%, color-mix(in srgb, var(--bg) 60%, transparent) 100%)",
};

const heroTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: "clamp(3rem, 8vw, 6rem)",
  lineHeight: 1.02,
  margin: "0.6rem 0 1.4rem",
  letterSpacing: "-0.02em",
};

const heroSubtitleStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: "1.1rem",
  maxWidth: 460,
  margin: "0 auto",
};

const planetTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: "clamp(2.2rem, 6vw, 4.6rem)",
  lineHeight: 1.02,
  margin: "0.6rem 0 1.4rem",
  letterSpacing: "-0.01em",
};

const planetDescriptionStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: "1.05rem",
  lineHeight: 1.7,
  maxWidth: 440,
};

const reducedHeroStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6vh 8vw",
};

const reducedSectionStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6vh 8vw",
};
