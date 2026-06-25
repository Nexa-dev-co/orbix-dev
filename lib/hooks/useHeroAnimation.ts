import { useCallback, useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';
import { measureUntransformedRect } from '@/lib/measureUntransformedRect';
import { REVEAL_EVENT } from '@/components/effects/IntroSequence/introEvents';
import { DECK_REVEAL_EVENT, DECK_HIDE_EVENT, GOTO_SERVICES_EVENT } from '@/components/sections/ServicesDeck/deckEvents';

// Marks the hero while the fleet is on screen. Scopes the services-only layering (sun drops
// behind the fleet, intervening layers go transparent) so it never touches the fill phase.
const SERVICES_CLASS = 'is-services';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
// A mobile address bar showing/hiding fires a resize on almost every scroll. Don't re-pin /
// re-measure on those vertical-only changes — only on real (width / orientation) ones — or the
// pinned square + sun jitter as you scroll on a phone.
ScrollTrigger.config({ ignoreMobileResize: true });

// ── The hero → services handoff (one pin, three phases) ────────────────
// A single pinned ScrollTrigger owns the whole transition so there's no second
// section glued on with a magic margin:
//   phase 1 (scrubbed)  — the black square fills the screen, the sun rises a little
//   at fill = 1         — the fleet is revealed on the now-full-black square
//   phase 2 (snapped)   — the carousel cycles through the craft
const SCROLL_SCRUB    = 1.8;
const FILL_SCROLL_VH  = 120; // viewport-heights of scroll the square takes to fill
const CRAFT_SCROLL_VH = 100; // ...and per craft step in the carousel that follows
const SUN_SCROLL_SCALE = 1.1; // the sun grows to 1.1× as the square fills
const SUN_SCROLL_RISE  = 200; // px the sun lifts above the square's centre and holds

// Deck reveal, fired when the fill completes / un-fired when you scroll back up.
const DECK_REVEAL_DURATION = 0.6;
const DECK_HIDE_DURATION   = 0.4;
const GOTO_DURATION        = 0.6; // programmatic scroll when a label/flick jumps to a craft
const SNAP_DURATION        = 0.5; // how quickly the carousel settles onto the nearest craft
// The carousel craft start a touch *past* the fill, so jumping to craft 0 lands on the fully
// revealed fleet instead of the fill/transition edge (which read as the section scrolling away).
const CAROUSEL_SETTLE_FRACTION = 0.08;

// ── Reveal (runs when the intro lands the sun in the square) ───────────
const TEXT_WIPE_DURATION   = 0.9;
const TEXT_WIPE_STAGGER    = 0.12;
const SQUARE_FILL_DURATION = 1.1; // the "cup filling with water" rise
const SUB_FADE_DURATION    = 0.6;
const FILL_START           = 0.25; // begins just after the headline starts rising
const FULL_CLIP  = 'inset(0% 0 0 0)';
const EMPTY_CLIP = 'inset(100% 0 0 0)';
// If the intro never fires its reveal (e.g. it was bypassed), reveal anyway.
const REVEAL_FALLBACK_MS = 7000;

const SUN_LAYER_SELECTOR = '.hero-sun-layer';
const DECK_SELECTOR      = '.services-deck';

interface HeroAnimationRefs {
  sectionRef:  RefObject<HTMLElement | null>;
  heroCardRef: RefObject<HTMLDivElement | null>;
  /** Set the craft on the pad — driven by the carousel phase of the pin. */
  setActiveCraft: (index: number) => void;
  /** How many craft the carousel cycles through. */
  craftCount: number;
}

export function useHeroAnimation(heroAnimationRefs: HeroAnimationRefs) {
  const { sectionRef, heroCardRef, setActiveCraft, craftCount } = heroAnimationRefs;

  // Keep the latest setter so the pin (built once at reveal) always calls the
  // current closure without rebuilding.
  const setActiveCraftRef = useRef(setActiveCraft);
  setActiveCraftRef.current = setActiveCraft;

  // The live jump fn lives in a ref so the returned `goTo` stays stable across renders.
  const goToImplementationRef = useRef<(index: number) => void>((index) =>
    setActiveCraftRef.current(index),
  );

  useEffect(() => {
    const heroSection     = sectionRef.current;
    const heroCardElement = heroCardRef.current;
    if (!heroSection || !heroCardElement) return;

    const reduceMotion = prefersReducedMotion();
    const steps        = Math.max(craftCount - 1, 1); // gaps between craft (3 for four craft)
    const totalVh      = FILL_SCROLL_VH + steps * CRAFT_SCROLL_VH;
    // The fraction of the pin the square-fill occupies; the carousel owns the rest.
    const fillFraction = FILL_SCROLL_VH / totalVh;
    // Craft sit in [carouselStart, 1] — a touch past the fill so craft 0 isn't on the reveal edge.
    const carouselStart = fillFraction + (1 - fillFraction) * CAROUSEL_SETTLE_FRACTION;
    const carouselSpan  = 1 - carouselStart;

    const textInners = heroSection.querySelectorAll('.hero-mask-inner');
    const squareFill = heroSection.querySelector('.hero-sun-fill');
    const subline    = heroSection.querySelector('.hero-sub');
    const sunLayer   = document.querySelector(SUN_LAYER_SELECTOR);
    const deck       = heroSection.querySelector<HTMLElement>(DECK_SELECTOR);

    // 1. Hide everything the reveal/transition will bring in. The intro veil covers
    //    the hero while this runs, so there's no flash.
    gsap.set(textInners, { yPercent: 115 });
    if (subline) gsap.set(subline, { autoAlpha: 0, y: 12 });
    if (squareFill) gsap.set(squareFill, { clipPath: EMPTY_CLIP });
    if (deck) gsap.set(deck, { autoAlpha: 0 });

    // ── Deck reveal / hide, keyed to the fill completing ──
    let deckRevealed = false;
    const revealDeck = () => {
      if (deckRevealed) return;
      deckRevealed = true;
      // Flip into the services-only layering (sun behind the fleet, intervening layers clear).
      heroSection.classList.add(SERVICES_CLASS);
      if (deck) {
        gsap.to(deck, {
          autoAlpha: 1,
          duration: reduceMotion ? 0 : DECK_REVEAL_DURATION,
          ease: 'power2.out',
          overwrite: true,
        });
      }
      // Tell the scene to (re)play the centred craft's entrance + switch the sun to its big/rapid
      // services look in step with the reveal.
      window.dispatchEvent(new Event(DECK_REVEAL_EVENT));
    };
    const hideDeck = () => {
      if (!deckRevealed) return;
      deckRevealed = false;
      heroSection.classList.remove(SERVICES_CLASS);
      if (deck) {
        gsap.to(deck, {
          autoAlpha: 0,
          duration: reduceMotion ? 0 : DECK_HIDE_DURATION,
          ease: 'power2.in',
          overwrite: true,
        });
      }
      // Return the sun to its calm hero look + front position.
      window.dispatchEvent(new Event(DECK_HIDE_EVENT));
    };

    // Free scrub through the fill, then snap to the nearest craft in the carousel range.
    const snapProgress = (value: number) => {
      if (value <= carouselStart) return value; // free scrub through the fill + settle zone
      const carouselProgress = (value - carouselStart) / carouselSpan;
      const snapped = Math.round(carouselProgress * steps) / steps;
      return carouselStart + snapped * carouselSpan;
    };

    // 2. The single pin — built lazily at reveal, never on mount. While the loader plays
    //    the page is locked at the top, but the binding must not exist at all: a restored
    //    or stray scroll would otherwise drive the sun/square while it's still flying in.
    let scrollTimeline: ReturnType<typeof gsap.timeline> | null = null;
    let lastCraft = -1;

    // Where the square + sun must travel/scale to fill the viewport. Measured from the square's
    // *untransformed* layout (so it's right at any scroll state) and recomputed on every
    // ScrollTrigger refresh — see invalidateOnRefresh / onRefreshInit below. This is what keeps
    // the sun locked to the square when the window resizes instead of ballooning or drifting.
    const computeGeometry = () => {
      const rect = measureUntransformedRect(heroCardElement);
      const cardCenterX = rect.left + rect.width  / 2;
      const cardCenterY = rect.top  + rect.height / 2;
      return {
        translateX: document.documentElement.clientWidth / 2 - cardCenterX,
        translateY: window.innerHeight / 2 - cardCenterY,
        scaleX:     document.documentElement.clientWidth / rect.width,
        scaleY:     window.innerHeight / rect.height,
      };
    };
    let geometry = computeGeometry();

    const createTransition = () => {
      scrollTimeline = gsap.timeline({
        scrollTrigger: {
          trigger:       heroSection,
          start:         'top top',
          end:           `+=${totalVh}%`,
          pin:           true,
          scrub:         SCROLL_SCRUB,
          anticipatePin: 1,
          // Recompute the fill geometry on every refresh (resize) and re-read the function-based
          // tween values below, so the square + sun stay locked to the square at any scroll
          // position rather than baking one-time pixel values.
          invalidateOnRefresh: true,
          onRefreshInit: () => { geometry = computeGeometry(); },
          snap:
            craftCount > 1
              ? { snapTo: snapProgress, duration: reduceMotion ? 0 : SNAP_DURATION, ease: 'power2.inOut' }
              : undefined,
          onUpdate: (self) => {
            const progress = self.progress;
            // Feed the navbar's "home" meter with the fill phase only (it reads full
            // once the square has filled and the carousel takes over).
            document.documentElement.style.setProperty(
              '--nav-progress-home',
              String(Math.min(progress / fillFraction, 1)),
            );

            if (progress >= fillFraction) {
              revealDeck();
              const carouselProgress = gsap.utils.clamp(0, 1, (progress - carouselStart) / carouselSpan);
              const craft = Math.round(carouselProgress * steps);
              if (craft !== lastCraft) {
                lastCraft = craft;
                setActiveCraftRef.current(craft);
              }
            } else {
              hideDeck();
            }
          },
        },
      });

      // Phase 1 — the square expands to fill the viewport while the sun rises + grows.
      // Function-based values so invalidateOnRefresh recomputes them from fresh geometry.
      scrollTimeline.to(heroCardElement, {
        x:            () => geometry.translateX,
        y:            () => geometry.translateY,
        scaleX:       () => geometry.scaleX,
        scaleY:       () => geometry.scaleY,
        borderRadius: 0,
        ease:         'power1.inOut',
        duration:     fillFraction,
      }, 0);

      if (sunLayer) {
        scrollTimeline.to(sunLayer, {
          x:        () => geometry.translateX,
          y:        () => geometry.translateY - SUN_SCROLL_RISE, // sits a little above centre and holds
          scale:    SUN_SCROLL_SCALE,
          ease:     'power1.inOut',
          duration: fillFraction,
        }, 0);
      }

      // Phase 2 — hold the filled square + risen sun while the carousel scroll runs.
      scrollTimeline.to({}, { duration: 1 - fillFraction });
    };

    // 3. Reveal — fired once, when the intro lands the sun in the square. This is also
    //    the moment the pin is allowed to come online (Contract 2).
    let hasRevealed = false;
    const runReveal = () => {
      if (hasRevealed) return;
      hasRevealed = true;

      createTransition();

      if (prefersReducedMotion()) {
        gsap.set(textInners, { yPercent: 0 });
        if (subline) gsap.set(subline, { autoAlpha: 1, y: 0 });
        if (squareFill) gsap.set(squareFill, { clipPath: FULL_CLIP });
        return;
      }

      const revealTimeline = gsap.timeline();
      // a. headline rises out of its masks
      revealTimeline.to(textInners, {
        yPercent: 0,
        duration: TEXT_WIPE_DURATION,
        stagger:  TEXT_WIPE_STAGGER,
        ease:     'power4.out',
      }, 0);
      // b. the square pours in like water behind the sun
      if (squareFill) revealTimeline.to(squareFill, {
        clipPath: FULL_CLIP,
        duration: SQUARE_FILL_DURATION,
        ease:     'power2.inOut',
      }, FILL_START);
      // c. tagline settles last
      if (subline) revealTimeline.to(subline, {
        autoAlpha: 1, y: 0, duration: SUB_FADE_DURATION, ease: 'power2.out',
      }, '>-0.3');
    };

    window.addEventListener(REVEAL_EVENT, runReveal);
    const fallbackTimeout = window.setTimeout(runReveal, REVEAL_FALLBACK_MS);

    // The navbar "Services" link asks the pin to scroll to the revealed fleet (craft 0).
    const onGotoServices = () => goToImplementationRef.current(0);
    window.addEventListener(GOTO_SERVICES_EVENT, onGotoServices);

    // Jump to a craft by scrolling to its snap point; onUpdate then re-stages it. Before the
    // pin exists (e.g. reduced-motion bypass), fall back to setting the craft directly.
    goToImplementationRef.current = (index: number) => {
      const clampedIndex = gsap.utils.clamp(0, craftCount - 1, index);
      const trigger = scrollTimeline?.scrollTrigger;
      if (!trigger) {
        setActiveCraftRef.current(clampedIndex);
        return;
      }
      const targetProgress = carouselStart + (clampedIndex / steps) * carouselSpan;
      const targetScroll   = trigger.start + targetProgress * (trigger.end - trigger.start);
      gsap.to(window, {
        scrollTo:  targetScroll,
        duration:  reduceMotion ? 0 : GOTO_DURATION,
        ease:      'power2.inOut',
        overwrite: true,
      });
    };

    return () => {
      window.removeEventListener(REVEAL_EVENT, runReveal);
      window.removeEventListener(GOTO_SERVICES_EVENT, onGotoServices);
      window.clearTimeout(fallbackTimeout);
      gsap.killTweensOf(window);
      scrollTimeline?.scrollTrigger?.kill();
      scrollTimeline?.kill();
    };
    // Built once at reveal; craftCount is constant for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionRef, heroCardRef, craftCount]);

  const goTo = useCallback((index: number) => goToImplementationRef.current(index), []);
  return { goTo };
}
