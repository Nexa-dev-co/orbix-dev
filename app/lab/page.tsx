"use client";

import { useEffect, useState } from "react";
import ParticleRevealHero from "@/components/reveal/ParticleRevealHero/ParticleRevealHero";
import WireframeRevealHero from "@/components/reveal/WireframeRevealHero/WireframeRevealHero";
import WordSwapRevealHero from "@/components/reveal/WordSwapRevealHero/WordSwapRevealHero";

const VARIANTS = [
  { key: "particle", label: "Particle X-ray", Component: ParticleRevealHero },
  { key: "wireframe", label: "Wireframe", Component: WireframeRevealHero },
  { key: "wordswap", label: "Word swap", Component: WordSwapRevealHero },
] as const;

type VariantKey = (typeof VARIANTS)[number]["key"];

/**
 * Lab to compare the three cursor-spotlight "helmet reveal" hero variants. One
 * is mounted at a time — pick via the switcher, or `?variant=particle|wireframe
 * |wordswap` — so the WebGL particle variant never fights a second canvas. Hover
 * the headline to reveal what's beneath. Isolated from the live site.
 */
export default function RevealLabPage() {
  const [active, setActive] = useState<VariantKey>("particle");

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("variant");
    if (VARIANTS.some((variant) => variant.key === param)) {
      setActive(param as VariantKey);
    }
  }, []);

  const ActiveHero = VARIANTS.find((variant) => variant.key === active)!.Component;

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", color: "var(--fg)" }}>
      <ActiveHero key={active} />

      {/* hint */}
      <div
        className="eyebrow"
        style={{
          position: "fixed",
          top: "clamp(1.4rem, 4vw, 2.6rem)",
          left: "50%",
          transform: "translateX(-50%)",
          color: "var(--muted)",
          textAlign: "center",
          pointerEvents: "none",
          zIndex: 50,
        }}
      >
        Move your cursor over the headline — it reveals what&rsquo;s beneath
      </div>

      {/* variant switcher */}
      <div
        style={{
          position: "fixed",
          bottom: "clamp(1.4rem, 4vw, 2.6rem)",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "0.4rem",
          padding: "0.4rem",
          borderRadius: 9999,
          border: "0.5px solid var(--border)",
          background: "color-mix(in srgb, var(--bg) 70%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 50,
        }}
      >
        {VARIANTS.map((variant) => {
          const isActive = variant.key === active;
          return (
            <button
              key={variant.key}
              type="button"
              data-cursor="link"
              onClick={() => setActive(variant.key)}
              className="eyebrow"
              style={{
                padding: "0.6rem 1.1rem",
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                color: isActive ? "var(--bg)" : "var(--muted)",
                background: isActive ? "var(--accent)" : "transparent",
                transition: "color 0.3s, background 0.3s",
              }}
            >
              {variant.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
