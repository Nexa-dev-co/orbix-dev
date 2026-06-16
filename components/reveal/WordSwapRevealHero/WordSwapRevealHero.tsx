"use client";

import SpotlightReveal from "@/components/reveal/SpotlightReveal/SpotlightReveal";

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
  fontSize: "clamp(2.4rem, 9vw, 7rem)",
  lineHeight: 1,
  letterSpacing: "-0.03em",
  textAlign: "center",
  maxWidth: "16ch",
};

/**
 * Word-swap reveal: identical headline on both layers, so where the spotlight
 * passes the final word flips from "websites." to an accent "worlds." Both
 * layers share the same layout so only that word changes under the aperture.
 */
export default function WordSwapRevealHero() {
  return (
    <SpotlightReveal
      surface={
        <div style={stage}>
          <h1 className="font-display" style={{ ...headline, color: "var(--fg)" }}>
            We don&rsquo;t build websites.
          </h1>
        </div>
      }
      beneath={
        <div style={stage} aria-hidden>
          <h1 className="font-display" style={{ ...headline, color: "var(--fg)" }}>
            We don&rsquo;t build <span style={{ color: "var(--accent)" }}>worlds.</span>
          </h1>
        </div>
      }
    />
  );
}
