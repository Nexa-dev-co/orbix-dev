import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';
import { REVEAL_EVENT } from '@/components/effects/IntroSequence/introEvents';

gsap.registerPlugin(ScrollTrigger);

// ── Scroll expansion ───────────────────────────────────────────────────
const SCROLL_SCRUB = 1.8;
const SCROLL_END    = '+=220%';
const SUN_SCROLL_SCALE = 1.5; // the sun grows to 1.5× as the black square fills the viewport
const SUN_SCROLL_RISE  = 120; // px the sun lifts above the square's centre at full scroll

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

interface HeroAnimationRefs {
  sectionRef:  RefObject<HTMLElement | null>;
  heroCardRef: RefObject<HTMLDivElement | null>;
}

function measureCardLayout(heroCardElement: HTMLDivElement) {
  // Temporarily clear any in-flight GSAP transform so getBoundingClientRect
  // returns the element's natural layout position, not its animated one
  const existingTransform         = heroCardElement.style.transform;
  heroCardElement.style.transform = 'none';
  const cardBoundingRect          = heroCardElement.getBoundingClientRect();
  heroCardElement.style.transform = existingTransform;
  return cardBoundingRect;
}

export function useHeroAnimation(heroAnimationRefs: HeroAnimationRefs) {
  const { sectionRef, heroCardRef } = heroAnimationRefs;

  useEffect(() => {
    const heroSection     = sectionRef.current;
    const heroCardElement = heroCardRef.current;
    if (!heroSection || !heroCardElement) return;

    const textInners = heroSection.querySelectorAll('.hero-mask-inner');
    const squareFill = heroSection.querySelector('.hero-sun-fill');
    const subline    = heroSection.querySelector('.hero-sub');
    const sunLayer   = document.querySelector(SUN_LAYER_SELECTOR);

    // 1. Hide everything the reveal will bring in. The intro veil covers the hero
    //    while this runs, so there's no flash.
    gsap.set(textInners, { yPercent: 115 });
    if (subline) gsap.set(subline, { autoAlpha: 0, y: 12 });
    if (squareFill) gsap.set(squareFill, { clipPath: EMPTY_CLIP });

    // 2. Scroll — built lazily at reveal, never on mount. While the loader plays the
    //    page is locked at the top, but the binding must not exist at all: if this
    //    pinned/scrubbed trigger were live during the intro, a restored or stray
    //    scroll would drive the sun's scale/translate while it's still flying in.
    //    Creating it here (after the sun lands) also means it measures final layout.
    let scrollTimeline: ReturnType<typeof gsap.timeline> | null = null;
    const createScrollExpansion = () => {
      // The black square expands to fill the viewport while the sun layer translates
      // to centre and grows to 2×. The sun layer only owns its outer transform here;
      // the intro owns the inner ".hero-sun-flight".
      const cardBoundingRect  = measureCardLayout(heroCardElement);
      const cardCenterX       = cardBoundingRect.left + cardBoundingRect.width  / 2;
      const cardCenterY       = cardBoundingRect.top  + cardBoundingRect.height / 2;
      const viewportCenterX   = document.documentElement.clientWidth / 2;
      const viewportCenterY   = window.innerHeight / 2;
      const translateX        = viewportCenterX - cardCenterX;
      const translateY        = viewportCenterY - cardCenterY;
      const fullscreenScaleX  = document.documentElement.clientWidth / cardBoundingRect.width;
      const fullscreenScaleY  = window.innerHeight / cardBoundingRect.height;

      scrollTimeline = gsap.timeline({
        scrollTrigger: {
          trigger:       heroSection,
          start:         'top top',
          end:           SCROLL_END,
          pin:           true,
          scrub:         SCROLL_SCRUB,
          anticipatePin: 1,
          // Feed the navbar's "home" meter (the logo's cyan line) with the hero's scroll
          // progress. Each section drives its own --nav-progress-<key> the same way.
          onUpdate: (self) => {
            document.documentElement.style.setProperty('--nav-progress-home', String(self.progress));
          },
        },
      });

      scrollTimeline.to(heroCardElement, {
        x:            translateX,
        y:            translateY,
        scaleX:       fullscreenScaleX,
        scaleY:       fullscreenScaleY,
        borderRadius: 0,
        ease:         'power1.inOut',
        duration:     1,
      }, 0);

      if (sunLayer) {
        scrollTimeline.to(sunLayer, {
          x:        translateX,
          y:        translateY - SUN_SCROLL_RISE, // sits above the square's centre
          scale:    SUN_SCROLL_SCALE,
          ease:     'power1.inOut',
          duration: 1,
        }, 0);
      }
    };

    // 3. Reveal — fired once, when the intro lands the sun in the square. This is also
    //    the moment the scroll-expansion is allowed to come online (see Contract 2).
    let hasRevealed = false;
    const runReveal = () => {
      if (hasRevealed) return;
      hasRevealed = true;

      createScrollExpansion();

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

    return () => {
      window.removeEventListener(REVEAL_EVENT, runReveal);
      window.clearTimeout(fallbackTimeout);
      scrollTimeline?.scrollTrigger?.kill();
      scrollTimeline?.kill();
    };
  }, []);
}
