import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HOLD as H, TRANSITION as TR } from "./config";
import type { OrbitScene } from "./scene";

gsap.registerPlugin(ScrollTrigger);

export interface Journey {
  scrollTrigger: ScrollTrigger;
  timeline: gsap.core.Timeline;
  /** normalised scroll positions (0–1) where each section rests */
  restPoints: number[];
}

interface JourneyOptions {
  scene: OrbitScene;
  trigger: HTMLElement;
  panels: HTMLElement[];
  /** camera pull-back distance during a transition */
  dip: number;
  onActive: (index: number) => void;
}

/**
 * Builds the scroll-scrubbed journey: for each step the camera eases back,
 * travels to the next planet and zooms in, while the section panels crossfade.
 * A gentle snap settles on each orbit. Returns handles for cleanup.
 */
export function buildJourney({ scene, trigger, panels, dip, onActive }: JourneyOptions): Journey {
  const pos = scene.planetPositions;
  const rest = scene.restDistances;
  const N = pos.length;

  const cam = { tx: pos[0].x, ty: pos[0].y, tz: pos[0].z, dist: rest[0] };
  gsap.set(panels[0], { autoAlpha: 1 });

  const timeline = gsap.timeline({
    onUpdate: () => scene.focus(cam.tx, cam.ty, cam.tz, cam.dist),
  });

  const restCenters: number[] = [H / 2];
  timeline.to({}, { duration: H });

  for (let i = 1; i < N; i++) {
    const at = H + (i - 1) * (TR + H);
    timeline.to(cam, { dist: dip, duration: 0.45, ease: "power2.in" }, at);
    timeline.to(cam, { tx: pos[i].x, ty: pos[i].y, tz: pos[i].z, duration: 0.9, ease: "power2.inOut" }, at + 0.1);
    timeline.to(cam, { dist: rest[i], duration: 0.45, ease: "power2.out" }, at + 0.55);
    timeline.to(panels[i - 1], { autoAlpha: 0, y: -20, duration: 0.3, ease: "power2.in" }, at);
    timeline.fromTo(panels[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, at + 0.7);
    restCenters.push(at + TR + H / 2);
  }

  const total = timeline.duration();
  const restPoints = restCenters.map((t) => t / total);
  const steps = restPoints.length - 1;

  const scrollTrigger = ScrollTrigger.create({
    trigger,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    animation: timeline,
    snap: { snapTo: restPoints, duration: { min: 0.2, max: 0.6 }, ease: "power1.inOut", delay: 0.05 },
    onUpdate: (self) => onActive(Math.round(self.progress * steps)),
  });

  return { scrollTrigger, timeline, restPoints };
}
