import { useCallback, useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';
import { REVEAL_EVENT } from '@/components/effects/IntroSequence/introEvents';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Fired every time the section reveals (first entry and every re-entry after a scroll-up hide).
// useServicesDeck listens for this to replay the centred craft's entrance, so the whole animation
// runs again each time you come back.
export const DECK_REVEAL_EVENT = 'deck:reveal';

// The section pins while the visitor scrolls through the fleet: scroll progress 0→1 maps across
// the craft, snapping to one per dwell. After the last, the pin releases and the page continues.
const VIEWPORTS_PER_STEP = 1;   // scroll distance (in viewport heights) between adjacent craft
const REVEAL_DURATION    = 0.6; // fade the stage in at pin-start (the "ship appears on black" beat)
const HIDE_DURATION      = 0.4; // fade the stage out when you scroll back up out of the section
const GOTO_DURATION      = 0.6; // programmatic scroll when a label/flick jumps to a craft
const SNAP_DURATION      = 0.5; // how quickly the pin settles onto the nearest craft
const REVEAL_FALLBACK_MS = 7000; // arm anyway if the intro never signals (bypassed)

const CANVAS_WRAP_SELECTOR = '.deck-canvas-wrap';
const OVERLAY_SELECTOR     = '.deck-overlay';

/**
 * Pins the Services section and turns vertical scroll into a carousel: each scroll "notch" snaps to
 * the next craft, driving `setActiveIndex`. Returns `goTo` so labels and ship-flicks can jump to a
 * craft by scrolling the page there — scroll stays the single source of truth for which craft shows.
 */
export function useDeckCarousel(
  sectionRef: RefObject<HTMLElement | null>,
  setActiveIndex: (index: number) => void,
  count: number,
) {
  // The live ScrollTrigger + jump fn live in refs so the returned `goTo` stays stable across renders.
  const goToImplementationRef = useRef<(index: number) => void>((index) => setActiveIndex(index));

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduceMotion = prefersReducedMotion();
    const steps = Math.max(count - 1, 1); // gaps between craft (3 for four craft)

    // The stage starts hidden; the pin's onEnter fades it in over the hero's black square. The
    // overlay is server-rendered (present now); the canvas wrap is a dynamic import that may mount
    // after this effect — its initial hidden state lives in CSS (.deck-canvas-wrap opacity:0), and
    // reveal() re-queries so it catches the canvas whenever it lands.
    const overlay = section.querySelector<HTMLElement>(OVERLAY_SELECTOR);
    if (overlay) gsap.set(overlay, { autoAlpha: 0 });

    // Re-queried each time because the canvas wrap is a dynamic import that may mount after this
    // effect (its initial hidden state lives in CSS — .deck-canvas-wrap opacity:0).
    const getStageTargets = () =>
      [
        section.querySelector<HTMLElement>(CANVAS_WRAP_SELECTOR),
        section.querySelector<HTMLElement>(OVERLAY_SELECTOR),
      ].filter((element): element is HTMLElement => Boolean(element));

    // The stage fades in when you scroll into the section and out when you scroll back up out of
    // it, so the deck only shows while you're on it. hasRevealed flips both ways so the reveal
    // replays cleanly on every re-entry.
    let hasRevealed = false;
    const reveal = () => {
      if (hasRevealed) return;
      hasRevealed = true;
      gsap.to(getStageTargets(), {
        autoAlpha: 1,
        duration: reduceMotion ? 0 : REVEAL_DURATION,
        ease: 'power2.out',
        overwrite: true,
      });
      // Tell the scene to replay the centred craft's entrance in step with the DOM fade-in.
      window.dispatchEvent(new Event(DECK_REVEAL_EVENT));
    };
    const hide = () => {
      if (!hasRevealed) return;
      hasRevealed = false;
      gsap.to(getStageTargets(), {
        autoAlpha: 0,
        duration: reduceMotion ? 0 : HIDE_DURATION,
        ease: 'power2.in',
        overwrite: true,
      });
    };

    // Until the hero's pinned ScrollTrigger exists (created on REVEAL_EVENT), the page layout below
    // the hero isn't final — wait for the intro to land, then build the pin against the real layout.
    let trigger: ScrollTrigger | null = null;
    let isArmed = false;
    const armTrigger = () => {
      if (isArmed) return;
      isArmed = true;
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        trigger = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: `+=${steps * VIEWPORTS_PER_STEP * 100}%`,
          pin: true,
          pinSpacing: true,
          snap: count > 1 ? { snapTo: 1 / steps, duration: reduceMotion ? 0 : SNAP_DURATION, ease: 'power2.inOut' } : undefined,
          onEnter: reveal,
          // Scrolling back up out of the section hides it (0.4 s); scrolling down in replays the
          // reveal. Leaving downward past the end keeps it shown — the page just continues.
          onLeaveBack: hide,
          onUpdate: (self) => {
            // React bails on an unchanged value, so this only re-stages on an actual crossing.
            setActiveIndex(Math.round(self.progress * steps));
          },
        });
      });
    };

    window.addEventListener(REVEAL_EVENT, armTrigger);
    const fallbackTimeout = window.setTimeout(armTrigger, REVEAL_FALLBACK_MS);

    // Jump to a craft by scrolling to its snap point; onUpdate then re-stages it. Before the pin
    // exists (e.g. reduced motion bypass), fall back to setting the index directly.
    goToImplementationRef.current = (index: number) => {
      const clampedIndex = gsap.utils.clamp(0, count - 1, index);
      if (!trigger) {
        setActiveIndex(clampedIndex);
        return;
      }
      const targetScroll = trigger.start + (clampedIndex / steps) * (trigger.end - trigger.start);
      gsap.to(window, {
        scrollTo: targetScroll,
        duration: reduceMotion ? 0 : GOTO_DURATION,
        ease: 'power2.inOut',
        overwrite: true,
      });
    };

    return () => {
      window.removeEventListener(REVEAL_EVENT, armTrigger);
      window.clearTimeout(fallbackTimeout);
      trigger?.kill();
      gsap.killTweensOf(window);
      const canvasWrap = section.querySelector<HTMLElement>(CANVAS_WRAP_SELECTOR);
      gsap.killTweensOf([canvasWrap, overlay].filter(Boolean));
    };
  }, [sectionRef, setActiveIndex, count]);

  const goTo = useCallback((index: number) => goToImplementationRef.current(index), []);
  return { goTo };
}
