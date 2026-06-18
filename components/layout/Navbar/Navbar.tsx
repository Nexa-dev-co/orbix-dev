'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const NAV_ITEMS = [
  { number: '01', label: 'Services', href: '#services' },
  { number: '02', label: 'Work',     href: '#work'     },
  { number: '03', label: 'Process',  href: '#process'  },
  { number: '04', label: 'Contact',  href: '#contact'  },
] as const;

const ENTER_DELAY    = 0.15;
const ENTER_DURATION = 0.9;
const SCROLL_FADE_PX = 100;

function OrbitalMark() {
  return (
    <div className="orbital-mark" aria-hidden="true">
      {/* Static: orbit ring + centre planet */}
      <svg className="orbital-static" width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="13" cy="13" r="9" stroke="rgba(0,229,255,0.18)" strokeWidth="0.75" strokeDasharray="2 2.5" />
        <circle cx="13" cy="13" r="2" fill="var(--accent)" />
      </svg>
      {/* Spinning: single orbiting node — the whole SVG rotates around its centre */}
      <svg className="orbital-spinning" width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="22" cy="13" r="1.5" fill="var(--accent)" opacity="0.85" />
      </svg>
    </div>
  );
}

export default function Navbar() {
  const navRef      = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav      = navRef.current;
    const progress = progressRef.current;
    if (!nav) return;

    // ── 1. Entrance ─────────────────────────────────────────────────
    const tl = gsap.timeline({ delay: ENTER_DELAY });

    tl.fromTo(nav,
        { y: -72, opacity: 0 },
        { y: 0, opacity: 1, duration: ENTER_DURATION, ease: 'expo.out' }
      )
      .fromTo(nav.querySelector('.nav-logo'),
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' },
        `-=${ENTER_DURATION * 0.65}`
      )
      .fromTo(nav.querySelectorAll('.nav-item'),
        { opacity: 0, y: -6 },
        { opacity: 1, y: 0, stagger: 0.065, duration: 0.45, ease: 'power2.out' },
        '<0.08'
      )
      .fromTo(nav.querySelector('.nav-cta'),
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' },
        '<0.1'
      );

    // ── 2. Scroll: background + progress ────────────────────────────
    const onScroll = () => {
      const scrollY      = window.scrollY;
      const scrollable   = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const navProgress  = Math.min(scrollY / SCROLL_FADE_PX, 1);
      const pageProgress = scrollY / scrollable;

      const bgOpacity  = 0.55 + navProgress * 0.35;
      const blurAmount = 14 + navProgress * 10;

      nav.style.background     = `rgba(6, 6, 6, ${bgOpacity})`;
      nav.style.backdropFilter = `blur(${blurAmount}px)`;
      nav.style.setProperty('-webkit-backdrop-filter', `blur(${blurAmount}px)`);

      if (progress) {
        progress.style.width = `${pageProgress * 100}%`;
      }
    };

    // Initialise background before first scroll
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      tl.kill();
    };
  }, []);

  return (
    <header ref={navRef} className="nav-root">

      {/* Top cyan accent line */}
      <div className="nav-accent-line" aria-hidden="true" />

      {/* Logo */}
      <a href="/" className="nav-logo">
        <OrbitalMark />
        <span className="nav-wordmark">ORBIX</span>
      </a>

      {/* Primary navigation */}
      <nav aria-label="Main navigation">
        <ul className="nav-items">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="nav-item">
              <a href={item.href} className="nav-link">
                <span className="nav-link-number">{item.number}</span>
                <span className="nav-link-label">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* CTA */}
      <button className="nav-cta" type="button">
        <span>Start Project</span>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
          <path
            d="M1 10L10 1M10 1H3.5M10 1V7.5"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="cta-corner cta-tl" aria-hidden="true" />
        <span className="cta-corner cta-tr" aria-hidden="true" />
        <span className="cta-corner cta-bl" aria-hidden="true" />
        <span className="cta-corner cta-br" aria-hidden="true" />
      </button>

      {/* Scroll progress indicator */}
      <div ref={progressRef} className="nav-progress" aria-hidden="true" />

    </header>
  );
}
