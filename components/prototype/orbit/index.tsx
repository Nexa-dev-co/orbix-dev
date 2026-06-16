"use client";

import { useEffect, useRef, useState } from "react";
import { DIP, type CameraMode } from "./config";
import { SECTIONS } from "./sections";
import { OrbitScene } from "./scene";
import { buildJourney } from "./journey";
import SectionPanel from "./SectionPanel";
import OrbitHud from "./OrbitHud";

/**
 * Orbital-map homepage prototype: zoom in to read a section, ease back and
 * travel along the route to the next orbit, zoom in again. Camera mode via
 * `?cam=fly` (default) | `zoom`. WebGL lives in OrbitScene; scroll choreography
 * in buildJourney; this component just wires them to React + the DOM.
 */
export default function OrbitMap() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const panels = useRef<HTMLDivElement[]>([]);
  const restPoints = useRef<number[]>([]);
  const triggerRef = useRef<{ start: number; end: number } | null>(null);

  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<CameraMode>("fly");
  const [reduced, setReduced] = useState(false);

  const jumpTo = (i: number) => {
    const t = triggerRef.current;
    const rest = restPoints.current[i];
    if (!t || rest == null) return;
    window.scrollTo({ top: t.start + rest * (t.end - t.start), behavior: "smooth" });
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    const wrapEl = wrap.current;
    const canvasEl = canvas.current;
    if (!wrapEl || !canvasEl) return;

    const camMode: CameraMode = new URLSearchParams(window.location.search).get("cam") === "zoom" ? "zoom" : "fly";
    setMode(camMode);

    const scene = new OrbitScene(canvasEl, SECTIONS);
    scene.start();

    const journey = buildJourney({
      scene,
      trigger: wrapEl,
      panels: panels.current,
      dip: DIP[camMode],
      onActive: (i) => setActive((cur) => (cur === i ? cur : i)),
    });
    restPoints.current = journey.restPoints;
    triggerRef.current = { start: journey.scrollTrigger.start, end: journey.scrollTrigger.end };

    const onResize = () => {
      scene.resize();
      journey.scrollTrigger.refresh();
      triggerRef.current = { start: journey.scrollTrigger.start, end: journey.scrollTrigger.end };
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      journey.scrollTrigger.kill();
      journey.timeline.kill();
      scene.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) {
    return (
      <div style={{ background: "var(--bg)", color: "var(--fg)" }}>
        {SECTIONS.map((s) => (
          <section key={s.nav} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "6vh 8vw", textAlign: "center" }}>
            <div style={{ maxWidth: 720, width: "100%" }}>
              <SectionPanel section={s} />
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrap} style={{ position: "relative", height: `${SECTIONS.length * 120}vh`, background: "var(--bg)" }}>
      <canvas ref={canvas} aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", background: "radial-gradient(circle at 50% 45%, transparent 45%, rgba(6,6,6,0.55) 100%)" }} />

      {SECTIONS.map((s, i) => (
        <div
          key={s.nav}
          ref={(el) => {
            if (el) panels.current[i] = el;
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8vw",
            color: "var(--fg)",
            opacity: i === 0 ? 1 : 0,
            pointerEvents: i === active ? "auto" : "none",
          }}
        >
          <div style={{ maxWidth: 760, width: "100%", textAlign: s.kind === "about" || s.kind === "contact" ? "center" : "left" }}>
            <SectionPanel section={s} />
          </div>
        </div>
      ))}

      <OrbitHud sections={SECTIONS} active={active} mode={mode} onJump={jumpTo} />
    </div>
  );
}
