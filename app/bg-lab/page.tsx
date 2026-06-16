"use client";

import { useEffect, useState } from "react";
import DotGridWave from "@/components/background/DotGridWave/DotGridWave";
import BoxesScene from "@/components/background/BoxesScene/BoxesScene";

const BACKGROUNDS = [
  { key: "dotwave", label: "Dot grid wave", Component: DotGridWave },
  { key: "boxes", label: "Boxes (Spline)", Component: BoxesScene },
] as const;

type BackgroundKey = (typeof BACKGROUNDS)[number]["key"];

/**
 * Lab to compare the backgrounds, each with sample headline content on top so
 * legibility is obvious. Switch via the bar below or `?bg=dotwave|boxes`. Both
 * are interactive (they react to the pointer) and standalone — either can later
 * drop behind the real Hero. Isolated from the site.
 */
export default function BackgroundLabPage() {
  const [active, setActive] = useState<BackgroundKey>("dotwave");

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("bg");
    if (BACKGROUNDS.some((background) => background.key === param)) {
      setActive(param as BackgroundKey);
    }
  }, []);

  const ActiveBackground = BACKGROUNDS.find((background) => background.key === active)!.Component;

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", color: "var(--fg)" }}>
      <ActiveBackground key={active} />

      {/* sample content — mixes the background with real headline type */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 6vw",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <h1
          className="font-display"
          style={{
            margin: 0,
            fontWeight: 800,
            fontSize: "clamp(2.8rem, 11vw, 9rem)",
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            textAlign: "center",
          }}
        >
          We build <span style={{ color: "var(--accent)" }}>worlds.</span>
        </h1>
      </div>

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
        Background lab — move your pointer; both react to it
      </div>

      {/* background switcher */}
      <div
        style={{
          position: "fixed",
          bottom: "clamp(1.4rem, 4vw, 2.6rem)",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
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
        {BACKGROUNDS.map((background) => {
          const isActive = background.key === active;
          return (
            <button
              key={background.key}
              type="button"
              data-cursor="link"
              onClick={() => setActive(background.key)}
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
              {background.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
