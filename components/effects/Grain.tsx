"use client";

import { useEffect, useRef } from "react";

/**
 * Animated film-grain overlay that reacts to scroll velocity. A 200×200 noise
 * tile is regenerated ~12fps and tiled across the viewport. When the user
 * scrolls fast the grain surges (higher alpha + brighter canvas) and stretches
 * vertically, like a film reel spinning; it settles when scrolling stops.
 * Disabled under reduced-motion.
 */
export default function Grain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Scroll velocity tracking ──
    let lastScrollY = window.scrollY;
    let velocity = 0;
    const onScroll = () => {
      velocity = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Offscreen tile we fill with noise.
    const TILE = 200;
    const noise = document.createElement("canvas");
    noise.width = TILE;
    noise.height = TILE;
    const nctx = noise.getContext("2d");
    if (!nctx) return;
    const imageData = nctx.createImageData(TILE, TILE);
    const buffer = imageData.data;

    const generateNoise = () => {
      // Faster scroll → more opaque grain (surge).
      const baseAlpha = 18;
      const velocityBoost = Math.min(velocity * 0.8, 30);
      const alpha = baseAlpha + velocityBoost;
      for (let i = 0; i < buffer.length; i += 4) {
        const value = Math.random() * 255;
        buffer[i] = value; // R
        buffer[i + 1] = value; // G
        buffer[i + 2] = value; // B
        buffer[i + 3] = alpha; // A
      }
      nctx.putImageData(imageData, 0, 0);
    };

    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const drawTiled = () => {
      ctx.clearRect(0, 0, width, height);
      // When scrolling fast, stretch each tile vertically for a motion smear.
      const stretch = velocity > 15 ? Math.min(velocity * 0.5, 120) : 0;
      const tileH = TILE + stretch;
      for (let y = 0; y < height; y += tileH) {
        for (let x = 0; x < width; x += TILE) {
          ctx.drawImage(noise, x, y, TILE, tileH);
        }
      }
    };

    // Throttle the noise refresh to ~12fps (every 80ms) via rAF.
    let animId = 0;
    let last = 0;
    const REFRESH = 80;
    const loop = (time: number) => {
      animId = requestAnimationFrame(loop);
      if (time - last < REFRESH) return;
      last = time;

      generateNoise();
      drawTiled();

      // Brighten with velocity, then ease velocity back down so it settles.
      canvas.style.opacity = `${0.3 + Math.min(velocity / 100, 0.3)}`;
      velocity *= 0.85;
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      ctx.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 9998,
        pointerEvents: "none",
        opacity: 0.4,
        transition: "opacity 0.2s ease",
      }}
    />
  );
}
