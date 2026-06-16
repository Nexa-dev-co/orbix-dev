import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { FieldScene } from "./FieldScene";
import type { StopKind } from "./content";
import { HERO_HOLD, HOLD, SEGMENTS } from "./config";

gsap.registerPlugin(ScrollTrigger);

interface JourneyOptions {
  scene: FieldScene;
  kinds: StopKind[];
  trigger: HTMLElement;
  panels: HTMLElement[];
  onActive: (index: number) => void;
  onProgress: (progress: number) => void;
}

export interface Journey {
  timeline: gsap.core.Timeline;
  scrollTrigger: ScrollTrigger;
  /** scroll progress (0..1) at which each destination is at rest — for jump nav */
  restPoints: number[];
}

/**
 * Maps scroll to the journey. A scrubbed timeline drives `scene.journeyPos`
 * destination by destination — each leg has its own length (SEGMENTS, they
 * escalate) and the scene derives the manoeuvre, morph and camera from it.
 *
 * Panel copy arrives with a different choreography per destination
 * (docs/TRANSITION_PHILOSOPHY.md Rule 1: never repeat a transition style);
 * leaving is always the same quick dissolution — the field reclaiming it.
 */
export function buildJourney({ scene, kinds, trigger, panels, onActive, onProgress }: JourneyOptions): Journey {
  panels.forEach((el) => prime(el));

  // Panel 0 is revealed by the loader-handoff intro, so it starts "active".
  let active = 0;
  const setActive = (i: number) => {
    if (i === active) return;
    if (active >= 0 && panels[active]) conceal(panels[active]);
    if (i >= 0 && panels[i]) reveal(panels[i], kinds[i]);
    active = i;
    onActive(i);
  };

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.9,
      onUpdate(self) {
        onProgress(self.progress);
        const near = Math.round(scene.journeyPos);
        setActive(Math.abs(scene.journeyPos - near) < 0.32 ? near : -1);
      },
    },
  });

  const restTimes: number[] = [0];
  tl.to({}, { duration: HERO_HOLD });
  for (let i = 1; i < kinds.length; i++) {
    tl.to(scene, { journeyPos: i, duration: SEGMENTS[i - 1].duration, ease: "power2.inOut" });
    restTimes.push(tl.duration());
    tl.to({}, { duration: HOLD });
  }

  const total = tl.duration();
  return {
    timeline: tl,
    scrollTrigger: tl.scrollTrigger!,
    restPoints: restTimes.map((t) => t / total),
  };
}

/* ── arrival choreographies — one identity per destination ── */

function reveal(panel: HTMLElement, kind: StopKind) {
  const els = items(panel);
  switch (kind) {
    case "orbits":
      // ring sweep: copy is unmasked left→right, as if an orbit passes over it
      gsap.set(els, { autoAlpha: 1, y: 0 });
      gsap.fromTo(
        els,
        { clipPath: "inset(0 100% 0 0)", x: -24 },
        { clipPath: "inset(0 0% 0 0)", x: 0, duration: 0.8, stagger: 0.07, ease: "power3.out", overwrite: true }
      );
      break;

    case "planets":
      // formation landing: rows settle out of a skewed fall, like accreting mass
      gsap.set(els, { clipPath: "inset(0 0% 0 0)", x: 0 });
      gsap.fromTo(
        els,
        { autoAlpha: 0, y: 54, skewY: 5, transformOrigin: "left bottom" },
        { autoAlpha: 1, y: 0, skewY: 0, duration: 0.85, stagger: 0.08, ease: "expo.out", overwrite: true }
      );
      break;

    case "streams":
      // signal decode: titles scramble into legibility, descriptions stream in
      gsap.set(els, { clipPath: "inset(0 0% 0 0)", y: 0, x: 0, skewY: 0 });
      gsap.fromTo(els, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.06, overwrite: true });
      panel.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el, n) => scramble(el, 0.08 * n));
      break;

    case "core":
      // docking: elements converge on the centreline from alternating sides
      gsap.set(els, { clipPath: "inset(0 0% 0 0)", y: 0, skewY: 0 });
      gsap.fromTo(
        els,
        { autoAlpha: 0, x: (n) => (n % 2 ? 70 : -70), scale: 1.04 },
        { autoAlpha: 1, x: 0, scale: 1, duration: 0.9, stagger: 0.07, ease: "back.out(1.4)", overwrite: true }
      );
      break;

    default:
      // hero re-entry (scrolling back up): simple rise inside the field bloom
      gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: "power3.out", overwrite: true });
  }
}

/** Leaving is always the field reclaiming the copy — quick dissolution. */
function conceal(panel: HTMLElement) {
  gsap.to(items(panel), {
    autoAlpha: 0,
    y: -16,
    duration: 0.3,
    ease: "power2.in",
    overwrite: true,
  });
}

function prime(panel: HTMLElement) {
  gsap.set(items(panel), { autoAlpha: 0, y: 26 });
}

function items(panel: HTMLElement) {
  return panel.querySelectorAll<HTMLElement>("[data-reveal]");
}

/* ── scramble decode (streams) ─────────────────────────── */

const GLYPHS = "█▓▒░<>/\\|=+*·";

function scramble(el: HTMLElement, delay: number) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent ?? "");
  const state = { p: 0 };
  gsap.to(state, {
    p: 1,
    duration: 0.7,
    delay,
    ease: "power2.out",
    overwrite: true,
    onUpdate() {
      const fixed = Math.floor(final.length * state.p);
      let out = final.slice(0, fixed);
      for (let i = fixed; i < final.length; i++) {
        out += final[i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
    },
    onComplete() {
      el.textContent = final;
    },
  });
}
