'use client';

import { useRef, useState } from 'react';
import { useServicesDeck, type DeckStatus } from '../hooks/useServicesDeck';

interface DeckCanvasProps {
  /** Index of the powered-on craft, or null when the fleet is dormant. */
  activeIndex: number | null;
  /** Index of the craft under the pointer, or null. */
  hoverIndex: number | null;
}

export default function DeckCanvas({ activeIndex, hoverIndex }: DeckCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<DeckStatus>({ isLoading: true, percent: -1 });

  useServicesDeck({ canvasRef, activeIndex, hoverIndex, onStatus: setStatus });

  return (
    <div className="deck-canvas-wrap">
      {/* Soft pool of light the fleet appears to rest within */}
      <div className="deck-glow" aria-hidden="true" />

      <canvas ref={canvasRef} className="deck-canvas" />

      <div
        className={`deck-loading ${status.isLoading ? 'is-visible' : ''}`}
        aria-hidden={!status.isLoading}
      >
        <span className="deck-loading-ring" />
        <span className="deck-loading-label">
          {status.percent >= 0
            ? `Bringing the fleet online · ${status.percent}%`
            : 'Bringing the fleet online'}
        </span>
      </div>
    </div>
  );
}
