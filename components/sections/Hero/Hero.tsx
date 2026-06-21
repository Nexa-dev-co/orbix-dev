'use client';

import { useRef } from 'react';
import { useHeroAnimation } from '@/lib/hooks/useHeroAnimation';
import FluidCursor from '@/components/effects/FluidCursor/FluidCursor';

export default function Hero() {
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroCardRef    = useRef<HTMLDivElement>(null);

  useHeroAnimation({ sectionRef: heroSectionRef, heroCardRef });

  return (
    <section ref={heroSectionRef} className="hero-section">

      {/* Fluid ink trail — scoped to the hero. Its absolute canvases sit between the
          tagline (below, so the ink inverts it) and the headline/sun (above). */}
      <FluidCursor />

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

      {/* Dark on the cream hero, and sits below the trail (z-index 1) so the ink
          inverts it to light — the tagline glows through the ink as the trail crosses it. */}
      <p className="hero-sub">software with its own gravity</p>

    </section>
  );
}
