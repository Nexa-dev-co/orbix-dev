"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { INTRO_DURATION, INTRO_DIST_SCALE } from "./config";
import { AMBIENT_PLANETS, STOPS } from "./sections";
import { DiveScene } from "./scene";
import { buildJourney } from "./journey";
import StopPanel from "./panels";
import Hud from "./Hud";

/**
 * The orbix homepage: a dive from the edge of a living orbital system down to
 * its core. The loader hands off by dispatching `orbix:reveal`, at which point
 * the camera — parked near the core — pulls back to the establishing shot and
 * the hero types in. Scrolling then descends shell by shell; the core is
 * contact. WebGL lives in DiveScene, choreography in buildJourney; this
 * component just wires them to React and the DOM.
 */
export default function OrbixHome() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const panels = useRef<HTMLDivElement[]>([]);
  const meterFill = useRef<HTMLDivElement>(null);
  const restPoints = useRef<number[]>([]);
  const triggerRef = useRef<{ start: number; end: number } | null>(null);

  const [active, setActive] = useState(0);
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

    const scene = new DiveScene(canvasEl, STOPS, AMBIENT_PLANETS);
    scene.start();

    const journey = buildJourney({
      scene,
      stops: STOPS,
      trigger: wrapEl,
      panels: panels.current,
      onActive: (i) => {
        scene.setActiveRing(i);
        setActive((cur) => (cur === i ? cur : i));
      },
      onProgress: (p) => {
        if (meterFill.current) meterFill.current.style.transform = `scaleY(${p})`;
      },
    });
    restPoints.current = journey.restPoints;
    triggerRef.current = { start: journey.scrollTrigger.start, end: journey.scrollTrigger.end };

    // Hold the hero copy + HUD until the loader hands off.
    const heroChildren = panels.current[0]?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [];
    gsap.set(heroChildren, { autoAlpha: 0, y: 26 });
    gsap.set(".dive-hud", { autoAlpha: 0 });

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      // Reloads mid-dive (browser scroll restore) skip the pull-back.
      if (journey.scrollTrigger.progress > 0.01) {
        scene.distScale = 1;
        gsap.set(heroChildren, { autoAlpha: 1, y: 0 });
        gsap.to(".dive-hud", { autoAlpha: 1, duration: 0.8, ease: "power2.out" });
        return;
      }
      gsap.fromTo(scene, { distScale: INTRO_DIST_SCALE }, { distScale: 1, duration: INTRO_DURATION, ease: "power2.inOut" });
      gsap.to(heroChildren, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09, ease: "power3.out", delay: INTRO_DURATION * 0.45 });
      gsap.to(".dive-hud", { autoAlpha: 1, duration: 1, stagger: 0.08, ease: "power2.out", delay: INTRO_DURATION * 0.7 });
    };
    window.addEventListener("orbix:reveal", reveal, { once: true });
    const fallback = window.setTimeout(reveal, 9000);

    const onResize = () => {
      scene.resize();
      journey.scrollTrigger.refresh();
      triggerRef.current = { start: journey.scrollTrigger.start, end: journey.scrollTrigger.end };
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("orbix:reveal", reveal);
      window.removeEventListener("resize", onResize);
      gsap.killTweensOf([scene, ...Array.from(heroChildren)]);
      journey.scrollTrigger.kill();
      journey.timeline.kill();
      scene.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) {
    return (
      <div className="dive-static">
        {STOPS.map((s) => (
          <section key={s.nav} className={`dive-static-section${s.kind === "overview" || s.kind === "core" ? " is-center" : ""}`}>
            <div className="dive-panel-inner">
              <StopPanel stop={s} />
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrap} className="dive-wrap" style={{ height: `${STOPS.length * 130}vh` }}>
      <canvas ref={canvas} aria-hidden className="dive-canvas" />
      <div className="dive-vignette" aria-hidden />

      {STOPS.map((s, i) => (
        <div
          key={s.nav}
          ref={(el) => {
            if (el) panels.current[i] = el;
          }}
          className={`dive-panel${s.kind === "overview" || s.kind === "core" ? " is-center" : ""}`}
          style={{ pointerEvents: i === active ? "auto" : "none" }}
        >
          <div className="dive-panel-inner">
            <StopPanel stop={s} />
          </div>
        </div>
      ))}

      <Hud stops={STOPS} active={active} meterRef={meterFill} onJump={jumpTo} />
    </div>
  );
}
