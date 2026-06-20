'use client';

import { useRef } from 'react';
import { useFluidCursor } from '@/lib/hooks/useFluidCursor';

// Two stacked full-viewport canvases fed by one fluid sim:
//   1. invert layer (mix-blend-mode: difference) — inverts the page beneath the
//      fluid so text glows through.
//   2. ink layer — the dark ink + stars, semi-transparent so the inverted text
//      shows through it (the backlit-in-dark-water look).
// Both ignore pointer events and sit above all page content.
const LAYER_Z_INDEX = 9000;

export default function FluidCursor() {
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const invertCanvasRef = useRef<HTMLCanvasElement>(null);

  useFluidCursor(inkCanvasRef, invertCanvasRef);

  const sharedStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
  };

  return (
    <div aria-hidden="true">
      <canvas
        ref={invertCanvasRef}
        style={{ ...sharedStyle, zIndex: LAYER_Z_INDEX, mixBlendMode: 'difference' }}
      />
      <canvas
        ref={inkCanvasRef}
        style={{ ...sharedStyle, zIndex: LAYER_Z_INDEX + 1, mixBlendMode: 'normal' }}
      />
    </div>
  );
}
