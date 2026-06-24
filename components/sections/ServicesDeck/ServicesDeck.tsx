'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { DECK_SERVICES } from './deckServices';
import { useDeckCarousel } from './hooks/useDeckCarousel';

// The viewer owns a WebGL context, so keep it out of the server graph.
const DeckCanvas = dynamic(() => import('./DeckCanvas/DeckCanvas'), { ssr: false });

export default function ServicesDeck() {
  const sectionRef = useRef<HTMLElement>(null);

  // The carousel always has exactly one craft on the pad. Scroll drives this (the pin maps scroll
  // progress to an index); flicks and label clicks jump by scrolling the page (see goTo).
  const [activeIndex, setActiveIndex] = useState(0);

  // useDeckCarousel pins the section, snaps scroll to each craft, and feeds activeIndex back here.
  const { goTo } = useDeckCarousel(sectionRef, setActiveIndex, DECK_SERVICES.length);

  // A horizontal flick on the craft moves one along; clamped inside goTo.
  const handleFlick = useCallback((direction: number) => goTo(activeIndex + direction), [goTo, activeIndex]);

  const activeService = DECK_SERVICES[activeIndex];

  return (
    <section ref={sectionRef} id="services" className="services-deck">
      {/* Solid black stage behind the fleet — matches the hero's filled square so the craft reads
          as materialising on the same black. */}
      <div className="deck-backdrop" aria-hidden="true" />

      <DeckCanvas activeIndex={activeIndex} onFlick={handleFlick} />

      <div className="deck-overlay">
        <header className="deck-head">
          <div className="deck-head-intro">
            <p className="eyebrow">The Fleet</p>
            <h2 className="deck-title font-display">
              One craft at a time.<br />Bring it online.
            </h2>
          </div>

          {/* Active-craft detail — keyed so it re-mounts and re-reveals on every change. */}
          <div className="deck-detail" key={activeService.index}>
            <p className="deck-detail-eyebrow font-display">{activeService.eyebrow}</p>
            <p className="deck-detail-copy">{activeService.description}</p>
            <ul className="deck-detail-tags">
              {activeService.capabilities.map((capability) => (
                <li key={capability} className="deck-detail-tag">{capability}</li>
              ))}
            </ul>
          </div>
        </header>

        {/* Carousel strip — the four craft as a row of names along the bottom. Drag the ship or
            scroll to cycle; clicking a name jumps straight to that craft. */}
        <nav className="deck-carousel" aria-label="Fleet">
          {DECK_SERVICES.map((service, index) => {
            const isActive = activeIndex === index;
            return (
              <button
                key={service.index}
                type="button"
                className={`deck-carousel-item ${isActive ? 'is-active' : ''}`}
                onClick={() => goTo(index)}
                aria-current={isActive}
              >
                <span className="deck-carousel-number">{service.index}</span>
                <span className="deck-carousel-name font-display">{service.name}</span>
                <span className="deck-carousel-line" aria-hidden="true" />
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
