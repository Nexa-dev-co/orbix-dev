'use client';

import { useRef } from 'react';
import { useHeroAnimation } from '@/lib/hooks/useHeroAnimation';

export default function Hero() {
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroCardRef    = useRef<HTMLDivElement>(null);

  useHeroAnimation({ sectionRef: heroSectionRef, heroCardRef });

  return (
    <section ref={heroSectionRef} className="hero-section">

      <div className="hero-main">
        <div
          className="hero-title-group"
          role="heading"
          aria-level={1}
          aria-label="we build worlds"
        >
          <p className="hero-line-top">
            <span className="hero-mask"><span className="hero-mask-inner">we build</span></span>
          </p>

          <div className="hero-line-bottom">
            <span className="hero-mask">
              <span className="hero-mask-inner hero-letter">W</span>
            </span>

            {/* Sun square — only the black fill lives here; the sun is the shared
                HeroSun overlay that lands on top of this slot. */}
            <div ref={heroCardRef} className="hero-sun-card" data-hero-card>
              <div className="hero-sun-fill" />
            </div>

            <span className="hero-mask">
              <span className="hero-mask-inner hero-letter">rlds</span>
            </span>
          </div>
        </div>
      </div>

      <p className="hero-sub">software with its own gravity</p>

    </section>
  );
}
