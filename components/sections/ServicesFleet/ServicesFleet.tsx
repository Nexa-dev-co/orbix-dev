'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FLEET_SERVICES } from './servicesData';

// The viewer owns a WebGL context, so keep it out of the server graph.
const FleetViewer = dynamic(() => import('./FleetViewer/FleetViewer'), {
  ssr: false,
});

export default function ServicesFleet() {
  const [activeIndex, setActiveIndex] = useState(0);
  // Incremented on every pick so selecting the active service again still replays the
  // vessel entrance — feedback even before each service has its own distinct model.
  const [selectionToken, setSelectionToken] = useState(0);

  const activeService = FLEET_SERVICES[activeIndex];

  const selectService = (index: number) => {
    setActiveIndex(index);
    setSelectionToken((token) => token + 1);
  };

  return (
    <section className="services-page">
      <FleetViewer modelPath={activeService.modelPath} selectionToken={selectionToken} />

      <div className="services-overlay">
        <header className="services-head">
          <p className="eyebrow">The Orbix Fleet</p>
          <h1 className="services-title font-display">
            Six disciplines,<br />one gravity.
          </h1>
        </header>

        <div className="services-body">
          {/* Index — selecting a service brings its vessel into the viewer */}
          <nav className="services-index" aria-label="Services">
            <ul>
              {FLEET_SERVICES.map((service, index) => {
                const isActive = index === activeIndex;
                return (
                  <li key={service.index}>
                    <button
                      type="button"
                      className={`services-index-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => selectService(index)}
                      onMouseEnter={() => selectService(index)}
                      aria-pressed={isActive}
                    >
                      <span className="services-index-number">{service.index}</span>
                      <span className="services-index-name font-display">{service.name}</span>
                      <span className="services-index-line" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Active service detail — keyed so it re-mounts and re-reveals on change */}
          <div className="services-detail" key={activeService.index}>
            <p className="services-detail-eyebrow">{activeService.eyebrow}</p>
            <p className="services-detail-copy">{activeService.description}</p>
            <ul className="services-tags">
              {activeService.capabilities.map((capability) => (
                <li key={capability} className="services-tag">{capability}</li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="services-foot">
          <span className="services-counter">
            <span className="services-counter-current">{activeService.index}</span>
            <span className="services-counter-divider">/</span>
            <span className="services-counter-total">{String(FLEET_SERVICES.length).padStart(2, '0')}</span>
          </span>
          <span className="services-hint">Hover the index — every vessel answers</span>
        </footer>
      </div>
    </section>
  );
}
