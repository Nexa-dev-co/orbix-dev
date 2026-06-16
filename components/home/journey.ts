import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BLOOM, CORE_DIST, DIP, HERO_HOLD, HOLD as H, OVERVIEW_DIST, restDistance, ROLL, TRANSITION as TR } from "./config";
import type { DiveStop } from "./sections";
import type { CamState, DiveScene } from "./scene";

gsap.registerPlugin(ScrollTrigger);

export interface Journey {
  scrollTrigger: ScrollTrigger;
  timeline: gsap.core.Timeline;
  /** normalised scroll positions (0–1) where each stop rests */
  restPoints: number[];
}

interface JourneyOptions {
  scene: DiveScene;
  stops: DiveStop[];
  trigger: HTMLElement;
  panels: HTMLElement[];
  onActive: (index: number) => void;
  /** raw dive progress 0–1, for the depth meter (called every scroll frame) */
  onProgress: (progress: number) => void;
}

/** Camera rest distance for a stop: overview shot, planet park, or core approach. */
export function stopDistance(stop: DiveStop): number {
  if (stop.kind === "overview") return OVERVIEW_DIST;
  if (stop.kind === "core") return CORE_DIST;
  return restDistance(stop.planet!.radius);
}

/**
 * Builds the scroll-scrubbed descent: at each step the camera eases off its
 * orbit, banks, falls inward to the next shell and settles, while the panel
 * content staggers out/in. The final step grades bloom down so the core stays
 * legible. Free momentum + a gentle snap onto each orbit (no hard scroll-jack).
 */
export function buildJourney({ scene, stops, trigger, panels, onActive, onProgress }: JourneyOptions): Journey {
  const N = stops.length;
  const dist = stops.map(stopDistance);
  const children = panels.map((p) => Array.from(p.querySelectorAll<HTMLElement>("[data-reveal]")));

  // Panels stay mounted; only their content reveals. Hero content is revealed
  // by the loader-handoff intro, not here.
  for (let i = 1; i < N; i++) gsap.set(children[i], { autoAlpha: 0 });

  const cam: CamState = { from: 0, to: 0, blend: 0, dist: dist[0] };
  scene.follow(cam);

  const timeline = gsap.timeline();
  const restCenters: number[] = [HERO_HOLD / 2];
  timeline.to({}, { duration: HERO_HOLD });

  for (let i = 1; i < N; i++) {
    const at = HERO_HOLD + (i - 1) * (TR + H);

    // travel: re-target, fall inward with a mid-dip, bank into the turn
    timeline.set(cam, { from: i - 1, to: i, blend: 0 }, at);
    timeline.to(cam, { blend: 1, duration: 0.9, ease: "power2.inOut" }, at + 0.05);
    timeline.to(cam, { dist: DIP, duration: 0.45, ease: "power2.in" }, at);
    timeline.to(cam, { dist: dist[i], duration: 0.45, ease: "power2.out" }, at + 0.55);
    timeline.to(scene, { roll: i % 2 ? ROLL : -ROLL, duration: 0.45, ease: "sine.in" }, at);
    timeline.to(scene, { roll: 0, duration: 0.5, ease: "sine.out" }, at + 0.5);

    // content crossfade, line by line
    timeline.to(children[i - 1], { autoAlpha: 0, y: -18, duration: 0.25, stagger: 0.025, ease: "power2.in" }, at);
    timeline.fromTo(children[i], { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.05, ease: "power3.out" }, at + 0.6);

    // final approach: pull the bloom down so type stays readable against the sun
    if (stops[i].kind === "core") {
      timeline.to(scene.bloomPass, { strength: BLOOM.coreStrength, duration: 0.5, ease: "none" }, at + 0.45);
    }

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
    onUpdate: (self) => {
      onActive(Math.round(self.progress * steps));
      onProgress(self.progress);
    },
  });

  return { scrollTrigger, timeline, restPoints };
}
