"use client";

import HeroCanvas from "@/components/canvas/HeroCanvas/HeroCanvas";
import SpotlightReveal from "@/components/reveal/SpotlightReveal/SpotlightReveal";

const HEADLINE = "We build worlds.";

const stage: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 6vw",
  background: "var(--bg)",
};

const headline: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  margin: 0,
  fontWeight: 800,
  fontSize: "clamp(2.8rem, 11vw, 9rem)",
  lineHeight: 0.95,
  letterSpacing: "-0.03em",
  textAlign: "center",
};

/**
 * "X-ray" reveal: the polished headline sits on top; underneath, the living
 * particle field (HeroCanvas) glows cyan. The spotlight exposes the engine that
 * builds the worlds — surface result on top, raw craft beneath.
 */
export default function ParticleRevealHero() {
  return (
    <SpotlightReveal
      surface={
        <div style={stage}>
          <h1 className="font-display" style={{ ...headline, color: "var(--fg)" }}>
            {HEADLINE}
          </h1>
        </div>
      }
      beneath={
        <div style={stage} aria-hidden>
          <HeroCanvas />
          <h1
            className="font-display"
            style={{ ...headline, color: "var(--accent)", textShadow: "0 0 45px var(--accent)" }}
          >
            {HEADLINE}
          </h1>
        </div>
      }
    />
  );
}
