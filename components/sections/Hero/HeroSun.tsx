'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { measureUntransformedRect } from '@/lib/measureUntransformedRect';
import { REVEAL_EVENT } from '@/components/effects/IntroSequence/introEvents';

// The single blue sun for the whole page. It lives here (not in the hero card and
// not in the loader) so exactly one WebGL sun exists: the intro flies it from the
// loader "o" into the hero square, then scroll expands it.
const SunCanvas = dynamic(() => import('./SunCanvas'), { ssr: false });

const HERO_SQUARE_SELECTOR = '.hero-sun-card';
const Z_DURING_INTRO = 10001; // above the loader veil (10000) so the sun shows in the "o"
const Z_AFTER_INTRO = 9500; //   above the fluid cursor (9000/9001), below the navbar (9999)

// Resize handling: hide the sun while the window is being resized, then re-place + fade it back
// in once it settles. RESIZE_SETTLE_MS is the debounce that defines "done resizing".
const RESIZE_SETTLE_MS = 180;
const RESIZE_FADE_SECONDS = 0.35;

export default function HeroSun() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    // Keep the outer layer parked over the hero square's footprint. The inner
    // element (intro) and this layer (scroll) animate from here.
    const syncToSquare = () => {
      const square = document.querySelector<HTMLElement>(HERO_SQUARE_SELECTOR);
      if (!square) return;
      // Measure the square's *untransformed* footprint. Its scroll transform scales it up to
      // fill the screen, and getBoundingClientRect includes that — reading it mid-scroll is what
      // made the sun balloon and drift out of the square on resize. The sun's own rise/scale is
      // applied separately by the hero pin, so the layer only needs the square's base box.
      const rect = measureUntransformedRect(square);
      layer.style.width = `${rect.width}px`;
      layer.style.height = `${rect.height}px`;
      layer.style.left = `${rect.left}px`;
      layer.style.top = `${rect.top}px`;
    };
    syncToSquare();

    // After the intro hands the sun over it stays visible (opacity:1). Track that so the resize
    // fade only runs post-intro and never fights the intro's own opacity animation.
    let introDone = false;
    const onReveal = () => {
      layer.style.zIndex = String(Z_AFTER_INTRO);
      introDone = true;
    };
    window.addEventListener(REVEAL_EVENT, onReveal);

    // Keeping the sun perfectly locked to the square *during* a live resize is a losing battle —
    // the square's base box (here) and the pin's scroll transform (ScrollTrigger) update on
    // different cadences, so the sun visibly skids. Instead: hide it the instant a resize starts,
    // wait for it to settle (debounce), refresh the pin + re-place the base box, then fade it back
    // in at the correct spot. On touch devices we ignore height-only resizes (the address bar
    // showing/hiding) so the sun doesn't blink on every scroll.
    const prefersCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    let lastWidth = window.innerWidth;
    let settleTimer = 0;
    let hidden = false;

    const hideSun = () => {
      layer.style.transition = 'none';
      layer.style.opacity = '0';
      hidden = true;
    };
    const showSun = () => {
      layer.style.transition = `opacity ${RESIZE_FADE_SECONDS}s ease`;
      layer.style.opacity = '1';
      hidden = false;
    };

    const handleResize = () => {
      const widthChanged = window.innerWidth !== lastWidth;
      lastWidth = window.innerWidth;
      // Mirror ScrollTrigger's ignoreMobileResize: a phone address bar fires height-only resizes
      // on almost every scroll — don't blink the sun for those.
      if (prefersCoarsePointer && !widthChanged) return;

      if (introDone && !hidden) hideSun();

      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        // Recompute the pin's fill transform for the new size, re-place the base box, THEN show —
        // so the sun only ever reappears once everything is consistent again.
        ScrollTrigger.refresh();
        syncToSquare();
        if (introDone) requestAnimationFrame(showSun);
      }, RESIZE_SETTLE_MS);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener(REVEAL_EVENT, onReveal);
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(settleTimer);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className="hero-sun-layer"
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 175,
        height: 175,
        zIndex: Z_DURING_INTRO,
        opacity: 0,
        pointerEvents: 'none',
        transformOrigin: 'center center',
      }}
    >
      <div
        className="hero-sun-flight"
        style={{ width: '100%', height: '100%', transformOrigin: 'center center', willChange: 'transform' }}
      >
        <SunCanvas />
      </div>
    </div>
  );
}
