import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';

const ENTRANCE_DELAY         = 0.15;
const ENTRANCE_DURATION      = 0.9;
const SCROLL_FADE_THRESHOLD  = 100; // px of scroll before nav background fully opaques
const BG_OPACITY_BASE        = 0.55;
const BG_OPACITY_RANGE       = 0.35;
const BLUR_BASE_PX           = 14;
const BLUR_RANGE_PX          = 10;

interface NavbarAnimationRefs {
  navRef:         RefObject<HTMLElement | null>;
  progressBarRef: RefObject<HTMLDivElement | null>;
}

export function useNavbarAnimation(navbarAnimationRefs: NavbarAnimationRefs) {
  const { navRef, progressBarRef } = navbarAnimationRefs;

  useEffect(() => {
    const navElement        = navRef.current;
    const progressBarElement = progressBarRef.current;
    if (!navElement) return;

    // 1. Entrance — nav slides down and items stagger in
    const entranceTimeline = gsap.timeline({ delay: ENTRANCE_DELAY });

    entranceTimeline
      .fromTo(navElement,
        { y: -72, opacity: 0 },
        { y: 0, opacity: 1, duration: ENTRANCE_DURATION, ease: 'expo.out' },
      )
      .fromTo(navElement.querySelector('.nav-logo'),
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' },
        `-=${ENTRANCE_DURATION * 0.65}`,
      )
      .fromTo(navElement.querySelectorAll('.nav-item'),
        { opacity: 0, y: -6 },
        { opacity: 1, y: 0, stagger: 0.065, duration: 0.45, ease: 'power2.out' },
        '<0.08',
      )
      .fromTo(navElement.querySelector('.nav-cta'),
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' },
        '<0.1',
      );

    // 2. Scroll — background opacity + blur increase as user scrolls past threshold
    const updateNavBackground = () => {
      const currentScrollY       = window.scrollY;
      const maxScrollableDistance = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const scrollFadeProgress   = Math.min(currentScrollY / SCROLL_FADE_THRESHOLD, 1);
      const pageScrollProgress   = currentScrollY / maxScrollableDistance;

      const backgroundOpacity = BG_OPACITY_BASE + scrollFadeProgress * BG_OPACITY_RANGE;
      const blurAmount        = BLUR_BASE_PX    + scrollFadeProgress * BLUR_RANGE_PX;

      navElement.style.background     = `rgba(6, 6, 6, ${backgroundOpacity})`;
      navElement.style.backdropFilter = `blur(${blurAmount}px)`;
      navElement.style.setProperty('-webkit-backdrop-filter', `blur(${blurAmount}px)`);

      if (progressBarElement) {
        progressBarElement.style.width = `${pageScrollProgress * 100}%`;
      }
    };

    // Set initial background before any scroll occurs
    updateNavBackground();

    window.addEventListener('scroll', updateNavBackground, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateNavBackground);
      entranceTimeline.kill();
    };
  }, []);
}
