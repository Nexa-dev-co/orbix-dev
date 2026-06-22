'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { DECK_SERVICES } from './deckServices';
import { useDeckReveal } from './hooks/useDeckReveal';
import { useDeckSnap } from './hooks/useDeckSnap';

// The viewer owns a WebGL context, so keep it out of the server graph.
const DeckCanvas = dynamic(() => import('./DeckCanvas/DeckCanvas'), { ssr: false });

export default function ServicesDeck() {
  const sectionRef = useRef<HTMLElement>(null);

  // Two independent states drive the deck: hover lights a ship up, a click powers
  // it on (steps forward, floats, reveals its detail). Single-active by design.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // The deck is pulled up over the hero's tail and stays hidden until the hero's black
  // square fills — this reveals the fleet on that black instead of an empty scroll.
  useDeckReveal(sectionRef);
  // If the visitor stalls partway through that transition, ease them the rest of the way.
  useDeckSnap();

  const activeService = activeIndex === null ? null : DECK_SERVICES[activeIndex];

  // Clicking the active ship powers it down; clicking another switches the active one.
  const toggleActive = (index: number) => {
    setActiveIndex((current) => (current === index ? null : index));
  };

  return (
    <section ref={sectionRef} className="services-deck">
      {/* Solid backdrop that pours in on reveal — transparent during the hero overlap so
          the square's fill shows through, opaque after so the fleet reads on true black. */}
      <div className="deck-backdrop" aria-hidden="true" />

      <DeckCanvas activeIndex={activeIndex} hoverIndex={hoverIndex} />

      <div className="deck-overlay">
        <header className="deck-head">
          <div className="deck-head-intro">
            <p className="eyebrow">The Fleet</p>
            <h2 className="deck-title font-display">
              Choose a craft.<br />Bring it online.
            </h2>
          </div>

          {/* Active service detail — keyed so it re-mounts and re-reveals on every change. */}
          {activeService && (
            <div className="deck-detail" key={activeService.index}>
              <p className="deck-detail-eyebrow font-display">{activeService.eyebrow}</p>
              <p className="deck-detail-copy">{activeService.description}</p>
              <ul className="deck-detail-tags">
                {activeService.capabilities.map((capability) => (
                  <li key={capability} className="deck-detail-tag">{capability}</li>
                ))}
              </ul>
            </div>
          )}
        </header>

        {/* Fleet columns — each button spans its ship's full vertical strip and ends in
            that ship's label. One button per column keeps hover continuous (no flicker
            between hovering the ship and hovering its label) and keeps the deck
            keyboard-accessible. onMouseLeave on the row clears hover when the pointer
            leaves the whole fleet. */}
        <div className="deck-fleet" onMouseLeave={() => setHoverIndex(null)}>
          {DECK_SERVICES.map((service, index) => {
            const isActive = activeIndex === index;
            const isHovered = hoverIndex === index;
            return (
              <button
                key={service.index}
                type="button"
                className={`deck-column ${isActive ? 'is-active' : ''} ${isHovered ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHoverIndex(index)}
                onFocus={() => setHoverIndex(index)}
                onBlur={() => setHoverIndex((current) => (current === index ? null : current))}
                onClick={() => toggleActive(index)}
                aria-pressed={isActive}
              >
                <span className="deck-label">
                  <span className="deck-label-number">{service.index}</span>
                  <span className="deck-label-name font-display">{service.name}</span>
                  <span className="deck-label-line" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
