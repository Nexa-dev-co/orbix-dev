"use client";

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
  margin: 0,
  fontWeight: 800,
  fontSize: "clamp(2.8rem, 11vw, 9rem)",
  lineHeight: 0.95,
  letterSpacing: "-0.03em",
  textAlign: "center",
};

// Faint blueprint grid behind the wireframe type.
const blueprint: React.CSSProperties = {
  ...stage,
  backgroundImage:
    "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
};

/**
 * "Blueprint" reveal: the rendered headline on top; the wireframe / source
 * version of the same type underneath (outline only, over a faint grid). Reads
 * as finished → how it's made.
 */
export default function WireframeRevealHero() {
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
        <div style={blueprint} aria-hidden>
          <h1
            className="font-display"
            style={{ ...headline, color: "transparent", WebkitTextStroke: "1px var(--accent)" }}
          >
            {HEADLINE}
          </h1>
        </div>
      }
    />
  );
}
