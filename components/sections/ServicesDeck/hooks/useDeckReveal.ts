import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';
import { REVEAL_EVENT } from '@/components/effects/IntroSequence/introEvents';

gsap.registerPlugin(ScrollTrigger);

// Fired once the hero's black square has filled and the deck slides into place. The WebGL
// hook (useServicesDeck) listens for this to play the fleet's staggered entrance, so the
// DOM elements and the ships arrive as one coordinated reveal.
export const DECK_REVEAL_EVENT = 'deck:reveal';

// Latched so a canvas that mounts *after* the reveal (the WebGL viewer is a dynamic import)
// can catch up instead of missing the one-shot event.
let deckHasRevealed = false;
export function deckIsRevealed() {
  return deckHasRevealed;
}

// The deck is pulled up one viewport (see .services-deck margin in globals.css) so it
// overlaps the hero's tail — the stretch where the fullscreen black square would otherwise
// just scroll away empty. Everything here starts hidden so the hero's fill reads through the
// deck across that overlap; the reveal then brings each element in on its own beat.
const REVEAL_START = 'top 8%'; // fires while the square is ~96% filled, just before the scroll end
const REVEAL_FALLBACK_MS = 7000; // arm the trigger anyway if the intro never signals (bypassed)

const BACKDROP_DURATION = 0.7;
const GLOW_DURATION     = 1.0;
const TEXT_DURATION     = 0.9;
const TEXT_RISE         = 30;
const LABEL_DURATION    = 0.7;
const LABEL_RISE        = 24;
const LABEL_STAGGER     = 0.1;

const BACKDROP_SELECTOR    = '.deck-backdrop';
const CANVAS_WRAP_SELECTOR = '.deck-canvas-wrap';
const GLOW_SELECTOR        = '.deck-glow';
const EYEBROW_SELECTOR     = '.deck-head .eyebrow';
const TITLE_SELECTOR       = '.deck-title';
const COLUMN_SELECTOR      = '.deck-column';

export function useDeckReveal(sectionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const backdrop = section.querySelector(BACKDROP_SELECTOR);
    const eyebrow  = section.querySelector(EYEBROW_SELECTOR);
    const title    = section.querySelector(TITLE_SELECTOR);
    const columns  = Array.from(section.querySelectorAll(COLUMN_SELECTOR));
    // The canvas wrapper + glow live in the dynamically-imported viewer, so they may not be
    // mounted yet here; they start hidden via CSS and are queried again at reveal time.

    // Already revealed this session (a re-mount / HMR after the first reveal) — present the
    // deck straight away and re-signal the fleet, no trigger needed.
    if (deckHasRevealed) {
      const canvasWrap = section.querySelector(CANVAS_WRAP_SELECTOR);
      const glow = section.querySelector(GLOW_SELECTOR);
      gsap.set([backdrop, canvasWrap, glow, eyebrow, title, ...columns].filter(Boolean), {
        autoAlpha: 1,
        y: 0,
      });
      window.dispatchEvent(new Event(DECK_REVEAL_EVENT));
      return;
    }

    // Hide the elements present at mount. autoAlpha also drops visibility, so the dormant
    // labels can't be hovered/clicked while the deck overlaps the hero, and — crucially — the
    // whole canvas layer (its ground pool would otherwise render dark over the hero) stays
    // hidden until the reveal.
    gsap.set(backdrop, { autoAlpha: 0 });
    gsap.set([eyebrow, title], { autoAlpha: 0, y: TEXT_RISE });
    gsap.set(columns, { autoAlpha: 0, y: LABEL_RISE });

    const reveal = () => {
      deckHasRevealed = true;

      const canvasWrap = section.querySelector(CANVAS_WRAP_SELECTOR);
      const glow = section.querySelector(GLOW_SELECTOR);
      // Signal the WebGL fleet to start its own staggered entrance alongside the DOM.
      window.dispatchEvent(new Event(DECK_REVEAL_EVENT));

      if (prefersReducedMotion()) {
        gsap.set([backdrop, canvasWrap, glow, eyebrow, title, ...columns].filter(Boolean), {
          autoAlpha: 1,
          y: 0,
        });
        return;
      }

      const timeline = gsap.timeline();
      // 1. The black backdrop pours in, and the fleet's stage (the canvas, with its ground
      //    pool) comes up with it — the ships themselves stay hidden until their own stagger.
      timeline.to(backdrop, { autoAlpha: 1, duration: BACKDROP_DURATION, ease: 'power2.out' }, 0);
      if (canvasWrap) timeline.to(canvasWrap, { autoAlpha: 1, duration: BACKDROP_DURATION, ease: 'power2.out' }, 0);
      // 2. The volumetric glow breathes in under the fleet.
      if (glow) timeline.to(glow, { autoAlpha: 1, duration: GLOW_DURATION, ease: 'power2.out' }, 0.1);
      // 3. Eyebrow, then title, rise out of the black.
      timeline.to(eyebrow, { autoAlpha: 1, y: 0, duration: TEXT_DURATION, ease: 'power3.out' }, 0.15);
      timeline.to(title, { autoAlpha: 1, y: 0, duration: TEXT_DURATION, ease: 'power3.out' }, 0.28);
      // 4. The four labels settle in, one after another.
      timeline.to(
        columns,
        { autoAlpha: 1, y: 0, duration: LABEL_DURATION, stagger: LABEL_STAGGER, ease: 'power3.out' },
        0.4,
      );
    };

    // The deck is pulled up one viewport, so until the hero's pinned ScrollTrigger exists
    // (also created on REVEAL_EVENT) the deck sits at the very top of the page — where this
    // reveal trigger's start is already met, firing it during the intro and flashing the deck
    // before the hero appears. So wait for the intro to land, then build the trigger against
    // the final, pinned layout (rAF defers past the hero's own REVEAL_EVENT handler).
    let trigger: ScrollTrigger | null = null;
    let isArmed = false;
    const armTrigger = () => {
      if (isArmed) return;
      isArmed = true;
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        trigger = ScrollTrigger.create({
          trigger: section,
          start: REVEAL_START,
          once: true,
          onEnter: reveal,
        });
      });
    };

    window.addEventListener(REVEAL_EVENT, armTrigger);
    const fallbackTimeout = window.setTimeout(armTrigger, REVEAL_FALLBACK_MS);

    return () => {
      window.removeEventListener(REVEAL_EVENT, armTrigger);
      window.clearTimeout(fallbackTimeout);
      trigger?.kill();
    };
  }, [sectionRef]);
}
