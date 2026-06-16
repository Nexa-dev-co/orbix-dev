"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { HOLD_RAMP, INTRO_DURATION, REVEAL_FALLBACK_MS, SIM_SIZE } from "./config";
import { STOPS } from "./content";
import { buildTargets } from "./shapes";
import { FieldScene } from "./FieldScene";
import { buildJourney, type Journey } from "./journey";
import StopPanel from "./panels";
import Hud from "./Hud";

/**
 * The orbix homepage: one GPGPU particle continuum is the entire page. The
 * journey travels the Orbix universe — wordmark, the four service orbits,
 * the project planets, the data streams, the core — and every destination
 * assembles out of the same field of matter. The cursor has mass;
 * press-and-hold collapses the field, release detonates a shockwave. The
 * loader hands off via `orbix:reveal`, which blooms the seed cluster into
 * the wordmark.
 */
export default function FieldHome() {
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

    let disposed = false;
    let scene: FieldScene | null = null;
    let journey: Journey | null = null;
    let holdTween: gsap.core.Tween | null = null;
    let fallback = 0;
    const listeners: [string, EventListener][] = [];
    const on = (name: string, fn: EventListener) => {
      window.addEventListener(name, fn);
      listeners.push([name, fn]);
    };

    (async () => {
      const simSize = window.innerWidth < 768 ? SIM_SIZE.mobile : SIM_SIZE.desktop;
      const targets = await buildTargets(simSize);
      if (disposed) {
        targets.stops.forEach((t) => t.dispose());
        targets.planets.forEach((t) => t.dispose());
        return;
      }

      const s = (scene = new FieldScene(canvasEl, simSize, targets));
      s.start();

      const j = (journey = buildJourney({
        scene: s,
        kinds: STOPS.map((stop) => stop.kind),
        trigger: wrapEl,
        panels: panels.current,
        onActive: (i) => setActive((cur) => (cur === i ? cur : i)),
        onProgress: (p) => {
          if (meterFill.current) meterFill.current.style.transform = `scaleX(${p})`;
        },
      }));
      restPoints.current = j.restPoints;
      triggerRef.current = { start: j.scrollTrigger.start, end: j.scrollTrigger.end };

      /* loader handoff: bloom the seed into the wordmark, rise the copy.
         HUD elements are queried off the wrap (not a string selector) so the
         tweens hit the right nodes even if a scoped gsap.context is active. */
      const heroChildren = panels.current[0]?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [];
      const hudParts = wrapEl.querySelectorAll<HTMLElement>(".field-hud");
      gsap.set(hudParts, { autoAlpha: 0 });

      let revealed = false;
      const reveal = () => {
        if (revealed) return;
        revealed = true;
        // Reloads mid-journey (browser scroll restore) skip the bloom.
        if (j.scrollTrigger.progress > 0.01) {
          s.intro = 0;
          gsap.to(hudParts, { autoAlpha: 1, duration: 0.8, ease: "power2.out" });
          return;
        }
        gsap.to(s, { intro: 0, duration: INTRO_DURATION, ease: "power3.inOut" });
        gsap.to(heroChildren, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09, ease: "power3.out", delay: INTRO_DURATION * 0.5 });
        gsap.to(hudParts, { autoAlpha: 1, duration: 1, stagger: 0.08, ease: "power2.out", delay: INTRO_DURATION * 0.7 });
      };
      on("orbix:reveal", reveal);
      // The loader may already have handed off (it finished while the targets
      // were still building, or this is an HMR remount) — catch up immediately.
      if (document.documentElement.dataset.orbixLoaded) reveal();
      else fallback = window.setTimeout(reveal, REVEAL_FALLBACK_MS);

      /* press-and-hold: the cursor becomes a black hole; release detonates */
      on("pointerdown", ((e: PointerEvent) => {
        if ((e.target as HTMLElement | null)?.closest("a,button")) return;
        holdTween?.kill();
        holdTween = gsap.to(s, { hold: 1, duration: HOLD_RAMP, ease: "power2.in" });
      }) as EventListener);
      const release = () => {
        if (!holdTween) return;
        holdTween.kill();
        holdTween = null;
        if (s.hold > 0.2) s.burst();
        gsap.to(s, { hold: 0, duration: 0.3, ease: "power3.out" });
      };
      on("pointerup", release);
      on("pointercancel", release);

      /* project-row hover → the field forms that project's planet */
      on("field:hover", ((e: CustomEvent<number>) => {
        if (e.detail >= 0) {
          s.hoverTexture = targets.planets[e.detail];
          gsap.to(s, { hoverMix: 1, duration: 0.9, ease: "power3.out", overwrite: "auto" });
        } else {
          gsap.to(s, { hoverMix: 0, duration: 0.6, ease: "power3.out", overwrite: "auto" });
        }
      }) as EventListener);

      on("resize", () => {
        s.resize();
        j.scrollTrigger.refresh();
        triggerRef.current = { start: j.scrollTrigger.start, end: j.scrollTrigger.end };
      });
    })();

    return () => {
      disposed = true;
      window.clearTimeout(fallback);
      listeners.forEach(([name, fn]) => window.removeEventListener(name, fn));
      holdTween?.kill();
      if (scene) gsap.killTweensOf(scene);
      journey?.scrollTrigger.kill();
      journey?.timeline.kill();
      scene?.dispose();
    };
  }, []);

  if (reduced) {
    return (
      <div className="field-static">
        {STOPS.map((s) => (
          <section key={s.nav} className={`field-static-section${s.kind === "hero" || s.kind === "core" ? " is-center" : ""}`}>
            <div className="field-panel-inner">
              <StopPanel stop={s} />
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrap} className="field-wrap" style={{ height: `${STOPS.length * 130}vh` }}>
      <canvas ref={canvas} aria-hidden className="field-canvas" />
      <div className="field-vignette" aria-hidden />

      {STOPS.map((s, i) => (
        <div
          key={s.nav}
          ref={(el) => {
            if (el) panels.current[i] = el;
          }}
          className={[
            "field-panel",
            `field-panel--${s.kind}`,
            (s.kind === "hero" || s.kind === "core") && "is-center",
            i === active && "is-active",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ pointerEvents: i === active ? "auto" : "none" }}
        >
          <div className="field-panel-inner">
            <StopPanel stop={s} />
          </div>
        </div>
      ))}

      <Hud stops={STOPS} active={active} meterRef={meterFill} onJump={jumpTo} />
    </div>
  );
}
