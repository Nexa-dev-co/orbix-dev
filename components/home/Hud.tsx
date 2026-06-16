import type { RefObject } from "react";
import type { DiveStop } from "./sections";

interface HudProps {
  stops: DiveStop[];
  active: number;
  /** fill element of the depth meter — driven directly (no re-renders) */
  meterRef: RefObject<HTMLDivElement>;
  onJump: (index: number) => void;
}

/**
 * The instrument layer over the dive: wordmark + CTA up top, orbit rail on the
 * right, depth meter on the left, telemetry readout at the bottom. Every block
 * carries `.dive-hud` so the intro can fade the whole layer in after the
 * loader hands off.
 */
export default function Hud({ stops, active, meterRef, onJump }: HudProps) {
  const last = stops.length - 1;

  return (
    <>
      <header className="dive-hud dive-header">
        <button type="button" className="font-display dive-logo" data-cursor="link" onClick={() => onJump(0)} aria-label="orbix — back to overview">
          orb<span className="dive-accent">i</span>x
        </button>
        <button type="button" className="dive-header-cta" data-cursor="link" onClick={() => onJump(last)}>
          Start a project <span aria-hidden>↗</span>
        </button>
      </header>

      <nav className="dive-hud dive-rail" aria-label="Orbits">
        {stops.map((s, i) => {
          const on = i === active;
          return (
            <button key={s.nav} type="button" data-cursor="link" onClick={() => onJump(i)} className={`dive-rail-stop${on ? " is-on" : ""}`}>
              <span className="eyebrow dive-rail-label">{s.nav}</span>
              <span className="dive-rail-tick" />
            </button>
          );
        })}
      </nav>

      <div className="dive-hud dive-meter" aria-hidden>
        <span className="eyebrow">SYS</span>
        <div className="dive-meter-track">
          <div ref={meterRef} className="dive-meter-fill" />
        </div>
        <span className="eyebrow dive-accent">CORE</span>
      </div>

      <div className="dive-hud dive-telemetry eyebrow" aria-hidden>
        <span className="dive-telemetry-dot" />
        {stops[active].telemetry}
      </div>
    </>
  );
}
