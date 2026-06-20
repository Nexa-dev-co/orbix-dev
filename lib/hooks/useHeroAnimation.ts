import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SCROLL_SCRUB    = 1.8;
const SCROLL_END      = '+=220%';
const ENTRANCE_DELAY  = 0.45;
const TEXT_DURATION   = 0.95;
const TEXT_STAGGER    = 0.11;
const CARD_DELAY      = 0.7;
const CARD_DURATION   = 1.05;

interface HeroAnimationRefs {
  sectionRef:        RefObject<HTMLElement | null>;
  heroCardRef:       RefObject<HTMLDivElement | null>;
  canvasWrapperRef:  RefObject<HTMLDivElement | null>;
}

function measureCardLayout(heroCardElement: HTMLDivElement) {
  // Temporarily clear any in-flight GSAP transform so getBoundingClientRect
  // returns the element's natural layout position, not its animated one
  const existingTransform        = heroCardElement.style.transform;
  heroCardElement.style.transform = 'none';
  const cardBoundingRect         = heroCardElement.getBoundingClientRect();
  heroCardElement.style.transform = existingTransform;
  return cardBoundingRect;
}

export function useHeroAnimation(heroAnimationRefs: HeroAnimationRefs) {
  const { sectionRef, heroCardRef, canvasWrapperRef } = heroAnimationRefs;

  useEffect(() => {
    const heroSection     = sectionRef.current;
    const heroCardElement = heroCardRef.current;
    if (!heroSection || !heroCardElement) return;

    // 1. Measure the card's natural position before any animation runs
    const cardBoundingRect  = measureCardLayout(heroCardElement);
    const cardCenterX       = cardBoundingRect.left + cardBoundingRect.width  / 2;
    const cardCenterY       = cardBoundingRect.top  + cardBoundingRect.height / 2;
    const viewportCenterX   = document.documentElement.clientWidth / 2;
    const viewportCenterY   = window.innerHeight / 2;
    const translateX        = viewportCenterX - cardCenterX;
    const translateY        = viewportCenterY - cardCenterY;
    const fullscreenScaleX  = document.documentElement.clientWidth / cardBoundingRect.width;
    const fullscreenScaleY  = window.innerHeight / cardBoundingRect.height;

    // 2. Entrance — text and card fade in on load
    gsap.fromTo(
      '[data-hero-text]',
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, stagger: TEXT_STAGGER, duration: TEXT_DURATION, delay: ENTRANCE_DELAY, ease: 'power3.out' },
    );
    gsap.fromTo(
      '[data-hero-card]',
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: CARD_DURATION, delay: CARD_DELAY, ease: 'power3.out' },
    );

    // 3. Scroll — card expands to fill the viewport while the sun holds at 2×
    const scrollTimeline = gsap.timeline({
      scrollTrigger: {
        trigger:      heroSection,
        start:        'top top',
        end:          SCROLL_END,
        pin:          true,
        scrub:        SCROLL_SCRUB,
        anticipatePin: 1,
      },
    });

    scrollTimeline.to(heroCardElement, {
      x:            translateX,
      y:            translateY,
      scaleX:       fullscreenScaleX,
      scaleY:       fullscreenScaleY,
      borderRadius: 0,
      zIndex:       50,
      ease:         'power1.inOut',
      duration:     1,
    }, 0);

    // Counter-scale the sun so its visual size grows to exactly 2× while the
    // card stretches non-uniformly to fill the viewport
    if (canvasWrapperRef.current) {
      scrollTimeline.to(canvasWrapperRef.current, {
        scaleX:   2 / fullscreenScaleX,
        scaleY:   2 / fullscreenScaleY,
        ease:     'power1.inOut',
        duration: 1,
      }, 0);
    }

    return () => {
      scrollTimeline.scrollTrigger?.kill();
      scrollTimeline.kill();
    };
  }, []);
}
