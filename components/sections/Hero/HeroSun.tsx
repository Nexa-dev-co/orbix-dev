'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { REVEAL_EVENT } from '@/components/effects/IntroSequence/introEvents';

// The single blue sun for the whole page. It lives here (not in the hero card and
// not in the loader) so exactly one WebGL sun exists: the intro flies it from the
// loader "o" into the hero square, then scroll expands it.
const SunCanvas = dynamic(() => import('./SunCanvas'), { ssr: false });

const HERO_SQUARE_SELECTOR = '.hero-sun-card';
const Z_DURING_INTRO = 10001; // above the loader veil (10000) so the sun shows in the "o"
const Z_AFTER_INTRO = 9500; //   above the fluid cursor (9000/9001), below the navbar (9999)

export default function HeroSun() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    // Keep the outer layer parked over the hero square's footprint. The inner
    // element (intro) and this layer (scroll) animate from here.
    const syncToSquare = () => {
      const square = document.querySelector(HERO_SQUARE_SELECTOR);
      if (!square) return;
      const rect = square.getBoundingClientRect();
      layer.style.width = `${rect.width}px`;
      layer.style.height = `${rect.height}px`;
      layer.style.left = `${rect.left}px`;
      layer.style.top = `${rect.top}px`;
    };
    syncToSquare();
    window.addEventListener('resize', syncToSquare);

    // Once the sun has landed and the loader is gone, drop below the navbar.
    const onReveal = () => {
      layer.style.zIndex = String(Z_AFTER_INTRO);
    };
    window.addEventListener(REVEAL_EVENT, onReveal);

    return () => {
      window.removeEventListener('resize', syncToSquare);
      window.removeEventListener(REVEAL_EVENT, onReveal);
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
