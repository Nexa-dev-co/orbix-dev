'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { useHeroAnimation } from '@/lib/hooks/useHeroAnimation';

const SunCanvas = dynamic(() => import('./SunCanvas'), { ssr: false });

export default function Hero() {
  const heroSectionRef    = useRef<HTMLElement>(null);
  const heroCardRef       = useRef<HTMLDivElement>(null);
  const canvasWrapperRef  = useRef<HTMLDivElement>(null);

  useHeroAnimation({ sectionRef: heroSectionRef, heroCardRef, canvasWrapperRef });

  return (
    <section ref={heroSectionRef} className="hero-section">

      <div className="hero-main">
        <div
          className="hero-title-group"
          role="heading"
          aria-level={1}
          aria-label="we build worlds"
        >
          <p className="hero-line-top" data-hero-text style={{ opacity: 0 }}>
            we build
          </p>

          <div className="hero-line-bottom">
            <span className="hero-letter" data-hero-text style={{ opacity: 0 }}>
              W
            </span>

            {/* Sun card — GSAP scroll-drives this to fill the viewport */}
            <div
              ref={heroCardRef}
              className="hero-sun-card"
              data-hero-card
              style={{ opacity: 0 }}
            >
              <div
                ref={canvasWrapperRef}
                style={{ width: '100%', height: '100%', transformOrigin: 'center center' }}
              >
                <SunCanvas />
              </div>
            </div>

            <span className="hero-letter" data-hero-text style={{ opacity: 0 }}>
              rlds
            </span>
          </div>
        </div>
      </div>

      <p className="hero-sub" data-hero-text style={{ opacity: 0 }}>
        software with its own gravity
      </p>

    </section>
  );
}
