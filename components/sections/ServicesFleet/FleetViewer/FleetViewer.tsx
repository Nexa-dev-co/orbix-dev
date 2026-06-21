'use client';

import { useRef, useState } from 'react';
import { useFleetViewer, type FleetViewerStatus } from '../hooks/useFleetViewer';

interface FleetViewerProps {
  modelPath: string;
  /** Bumped on every selection so re-picking the active service replays the entrance. */
  selectionToken: number;
}

export default function FleetViewer({ modelPath, selectionToken }: FleetViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<FleetViewerStatus>({ isLoading: true, percent: -1 });

  useFleetViewer({ canvasRef, modelPath, selectionToken, onStatus: setStatus });

  return (
    <div className="fleet-viewer">
      {/* Soft volumetric glow the vessel appears to hover within */}
      <div className="fleet-viewer-glow" aria-hidden="true" />

      <canvas ref={canvasRef} className="fleet-canvas" />

      <div
        className={`fleet-loading ${status.isLoading ? 'is-visible' : ''}`}
        aria-hidden={!status.isLoading}
      >
        <span className="fleet-loading-ring" />
        <span className="fleet-loading-label">
          {status.percent >= 0 ? `Materialising vessel · ${status.percent}%` : 'Materialising vessel'}
        </span>
      </div>
    </div>
  );
}
