'use client';

import { useRef } from 'react';
import { useNavbarAnimation } from '@/lib/hooks/useNavbarAnimation';

const NAV_ITEMS = [
  { number: '01', label: 'Services', href: '/services' },
  { number: '02', label: 'Work',     href: '#work'     },
  { number: '03', label: 'Process',  href: '#process'  },
  { number: '04', label: 'Contact',  href: '#contact'  },
] as const;

function OrbitalMark() {
  return (
    <div className="orbital-mark" aria-hidden="true">
      <svg className="orbital-static" width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="13" cy="13" r="9" stroke="rgba(0,229,255,0.18)" strokeWidth="0.75" strokeDasharray="2 2.5" />
        <circle cx="13" cy="13" r="2" fill="var(--accent)" />
      </svg>
      <svg className="orbital-spinning" width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="22" cy="13" r="1.5" fill="var(--accent)" opacity="0.85" />
      </svg>
    </div>
  );
}

export default function Navbar() {
  const navRef         = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useNavbarAnimation({ navRef, progressBarRef });

  return (
    <header ref={navRef} className="nav-root">

      <div className="nav-accent-line" aria-hidden="true" />

      <a href="/" className="nav-logo">
        <OrbitalMark />
        <span className="nav-wordmark">ORBIX</span>
      </a>

      <nav aria-label="Main navigation">
        <ul className="nav-items">
          {NAV_ITEMS.map((navItem) => (
            <li key={navItem.href} className="nav-item">
              <a href={navItem.href} className="nav-link">
                <span className="nav-link-number">{navItem.number}</span>
                <span className="nav-link-label">{navItem.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

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

      <div ref={progressBarRef} className="nav-progress" aria-hidden="true" />

    </header>
  );
}
