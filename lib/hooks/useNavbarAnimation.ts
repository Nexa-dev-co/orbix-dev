import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';

const ENTRANCE_DELAY    = 0.15;
const ENTRANCE_DURATION = 0.9;

interface NavbarAnimationRefs {
  navRef:         RefObject<HTMLElement | null>;
  accentRef:      RefObject<HTMLDivElement | null>;
  progressBarRef: RefObject<HTMLDivElement | null>;
}

export function useNavbarAnimation(navbarAnimationRefs: NavbarAnimationRefs) {
  const { navRef, accentRef, progressBarRef } = navbarAnimationRefs;

  useEffect(() => {
    const navElement         = navRef.current;
    const accentElement      = accentRef.current;
    const progressBarElement = progressBarRef.current;
    if (!navElement) return;

    // 1. Entrance — the bar slides down and items stagger in. The cyan accent layer
    //    fades in alongside it so the un-inverted mark/line don't pop separately.
    //    (No scroll-driven background/blur here: the bar is transparent so its
    //    mix-blend-mode: difference can invert against the page underneath it.)
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

    if (accentElement) {
      entranceTimeline.to(accentElement, { opacity: 1, duration: ENTRANCE_DURATION, ease: 'expo.out' }, 0);
    }

    // 2. Scroll — drive only the progress bar width (no background to animate now).
    const updateProgressBar = () => {
      if (!progressBarElement) return;
      const maxScrollableDistance = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const pageScrollProgress    = window.scrollY / maxScrollableDistance;
      progressBarElement.style.width = `${pageScrollProgress * 100}%`;
    };

    updateProgressBar();
    window.addEventListener('scroll', updateProgressBar, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateProgressBar);
      entranceTimeline.kill();
    };
  }, []);
}
