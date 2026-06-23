import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';
import { REVEAL_EVENT } from '@/components/effects/IntroSequence/introEvents';

gsap.registerPlugin(ScrollTrigger);

// Fired every time the deck scrolls into view. The WebGL hook (useServicesDeck) listens for
// this to (re)play the fleet's staggered, per-ship entrance, so the DOM and the ships arrive
// together each time.
export const DECK_REVEAL_EVENT = 'deck:reveal';

// Latched on first entrance: lets a canvas that mounts *after* it (the WebGL viewer is a
// dynamic import) catch up, and tells useDeckSnap to stop assisting once the deck's been seen.
let deckHasRevealed = false;
export function deckIsRevealed() {
  return deckHasRevealed;
}

// The deck is pulled up one viewport (see .services-deck margin in globals.css) so it overlaps
// the hero's tail. It shows only while you're at the section: scrolling down past this guard
// line plays the entrance; scrolling back up past it fades the whole deck out.
const GUARD_THRESHOLD = 'top 20%'; // guard line: section top this far down the viewport
const HIDE_DURATION   = 0.4;       // seconds for the smooth fade-out when you scroll away
const REVEAL_FALLBACK_MS = 7000;   // arm anyway if the intro never signals (bypassed)

// DOM entrance (the ships have their own moves in useServicesDeck).
const TEXT_DURATION  = 0.9;
const TEXT_RISE      = 30;
const LABEL_DURATION = 0.7;
const LABEL_RISE     = 24;
const LABEL_STAGGER  = 0.1;

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

    const reduceMotion = prefersReducedMotion();

    // Queried lazily each time: the canvas + glow live in the dynamically-imported viewer and
    // may mount after this effect runs.
    const getElements = () => ({
      backdrop:   section.querySelector(BACKDROP_SELECTOR),
      canvasWrap: section.querySelector(CANVAS_WRAP_SELECTOR),
      glow:       section.querySelector(GLOW_SELECTOR),
      eyebrow:    section.querySelector(EYEBROW_SELECTOR),
      title:      section.querySelector(TITLE_SELECTOR),
      columns:    Array.from(section.querySelectorAll(COLUMN_SELECTOR)),
    });

    // Entrance — replays each time you scroll into the section.
    const playEntrance = () => {
      deckHasRevealed = true;
      const { backdrop, canvasWrap, glow, eyebrow, title, columns } = getElements();

      // Tell the fleet to (re)play its per-ship intros. Done first so the ships reset to
      // hidden before the section becomes visible (no flash of the previous pose).
      window.dispatchEvent(new Event(DECK_REVEAL_EVENT));

      if (reduceMotion) {
        gsap.set([section, backdrop, canvasWrap, glow, eyebrow, title, ...columns].filter(Boolean), {
          autoAlpha: 1,
          y: 0,
        });
        return;
      }

      // The section + its stage come on at once (you're arriving onto the hero's black square,
      // so there's nothing to crossfade); the ships and labels then animate in on top.
      gsap.set([section, backdrop, canvasWrap, glow].filter(Boolean), { autoAlpha: 1 });
      gsap.fromTo(
        eyebrow,
        { autoAlpha: 0, y: TEXT_RISE },
        { autoAlpha: 1, y: 0, duration: TEXT_DURATION, ease: 'power3.out', overwrite: true },
      );
      gsap.fromTo(
        title,
        { autoAlpha: 0, y: TEXT_RISE },
        { autoAlpha: 1, y: 0, duration: TEXT_DURATION, delay: 0.12, ease: 'power3.out', overwrite: true },
      );
      gsap.fromTo(
        columns,
        { autoAlpha: 0, y: LABEL_RISE },
        { autoAlpha: 1, y: 0, duration: LABEL_DURATION, stagger: LABEL_STAGGER, delay: 0.2, ease: 'power3.out', overwrite: true },
      );
    };

    // Exit — smooth, timed fade-out of the whole deck when you scroll back up away from it.
    const playExit = () => {
      gsap.to(section, {
        autoAlpha: 0,
        duration: reduceMotion ? 0 : HIDE_DURATION,
        ease: 'power2.in',
        overwrite: true,
      });
    };

    // Already entered this session (a re-mount / HMR) — show it and re-signal the fleet. The
    // scroll triggers below need the hero's pin (which HMR won't rebuild), so skip them; a full
    // reload restores the scroll behaviour.
    if (deckHasRevealed) {
      const { backdrop, canvasWrap, glow, eyebrow, title, columns } = getElements();
      gsap.set([section, backdrop, canvasWrap, glow, eyebrow, title, ...columns].filter(Boolean), {
        autoAlpha: 1,
        y: 0,
      });
      window.dispatchEvent(new Event(DECK_REVEAL_EVENT));
      return;
    }

    // Start hidden; the entrance brings it in.
    gsap.set(section, { autoAlpha: 0 });

    // Until the hero's pinned ScrollTrigger exists (created on REVEAL_EVENT) the deck sits at
    // the very top of the page, where this guard's start is already met — so wait for the intro
    // to land, then build the trigger against the final, pinned layout.
    let trigger: ScrollTrigger | null = null;
    let isArmed = false;
    const armTrigger = () => {
      if (isArmed) return;
      isArmed = true;
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        trigger = ScrollTrigger.create({
          trigger: section,
          start: GUARD_THRESHOLD,
          onEnter: playEntrance,
          onLeaveBack: playExit,
        });
      });
    };

    window.addEventListener(REVEAL_EVENT, armTrigger);
    const fallbackTimeout = window.setTimeout(armTrigger, REVEAL_FALLBACK_MS);

    return () => {
      window.removeEventListener(REVEAL_EVENT, armTrigger);
      window.clearTimeout(fallbackTimeout);
      trigger?.kill();
      gsap.killTweensOf(section);
    };
  }, [sectionRef]);
}
