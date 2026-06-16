import type { RefObject } from "react";
import { HERO, type FieldStop } from "./content";

interface HudProps {
  stops: FieldStop[];
  active: number;
  /** fill element of the journey meter — driven directly (no re-renders) */
  meterRef: RefObject<HTMLDivElement>;
  onJump: (index: number) => void;
}

/**
 * Minimal chrome over the field: wordmark + CTA up top, stop rail on the
 * right, journey meter + current stop bottom-left, interaction hint
 * bottom-right. Everything carries `.field-hud` so the intro can fade the
 * layer in after the loader hands off.
 */
export default function Hud({ stops, active, meterRef, onJump }: HudProps) {
  const last = stops.length - 1;
  const current = active >= 0 ? active : null;

  return (
    <>
      <header className="field-hud field-header">
        <button type="button" className="font-display field-logo" data-cursor="link" onClick={() => onJump(0)} aria-label="orbix — back to start">
          orb<span className="field-accent">i</span>x
        </button>
        <button type="button" className="field-header-cta" data-cursor="link" onClick={() => onJump(last)}>
          Start a project <span aria-hidden>↗</span>
        </button>
      </header>

      <nav className="field-hud field-rail" aria-label="Sections">
        {stops.map((s, i) => (
          <button
            key={s.nav}
            type="button"
            data-cursor="link"
            onClick={() => onJump(i)}
            className={`field-rail-stop${i === active ? " is-on" : ""}`}
          >
            <span className="eyebrow field-rail-label">{s.nav}</span>
            <span className="field-rail-tick" />
          </button>
        ))}
      </nav>

      <div className="field-hud field-meter" aria-hidden>
        <div className="field-meter-track">
          <div ref={meterRef} className="field-meter-fill" />
        </div>
        <span className="eyebrow field-meter-label">
          {current != null ? `${String(current + 1).padStart(2, "0")} / ${String(stops.length).padStart(2, "0")} — ${stops[current].nav}` : "· · ·"}
        </span>
      </div>

      <div className="field-hud field-hint eyebrow" aria-hidden>
        {HERO.hint}
      </div>
    </>
  );
}
