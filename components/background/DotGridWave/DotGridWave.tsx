"use client";

import { useEffect, useRef } from "react";

const SPACING = 34; // px between dots
const BASE_RADIUS = 1.2; // px dot at the wave trough
const CREST_GROWTH = 2.4; // px extra radius at the wave crest
const WAVE_SPEED = 0.0022; // phase advance per ms
const COLOR_TROUGH = [0, 229, 255]; // cyan
const COLOR_CREST = [138, 92, 255]; // violet
const COLOR_CURSOR = [150, 246, 255]; // hot cyan-white right under the pointer
const INFLUENCE_RADIUS = 200; // px — how far the cursor's glow reaches
const CURSOR_GROWTH = 3.4; // px extra radius right under the cursor

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

/**
 * Dot-grid pattern with a diagonal colour wave sweeping across it: dots near the
 * crest grow and shift cyan→violet. Interactive — dots near the cursor brighten,
 * swell and run hot-cyan, so the field reacts to the pointer. Canvas 2D. Renders
 * a single static frame (no wave, no cursor glow) under reduced-motion.
 */
export default function DotGridWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Pointer position in CSS pixels; off-screen until the first move.
    const pointer = { x: -9999, y: -9999 };
    const onPointerMove = (event: MouseEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (phase: number) => {
      ctx.clearRect(0, 0, width, height);
      for (let y = SPACING; y < height; y += SPACING) {
        for (let x = SPACING; x < width; x += SPACING) {
          const mix = (Math.sin((x + y) * 0.01 + phase) + 1) / 2; // 0..1 across the wave
          let red = lerp(COLOR_TROUGH[0], COLOR_CREST[0], mix);
          let green = lerp(COLOR_TROUGH[1], COLOR_CREST[1], mix);
          let blue = lerp(COLOR_TROUGH[2], COLOR_CREST[2], mix);
          let radius = BASE_RADIUS + mix * CREST_GROWTH;
          let alpha = 0.12 + mix * 0.5;

          // Cursor glow — quadratic falloff so the hot core stays tight.
          const distance = Math.hypot(x - pointer.x, y - pointer.y);
          if (distance < INFLUENCE_RADIUS) {
            const pull = (1 - distance / INFLUENCE_RADIUS) ** 2;
            red = lerp(red, COLOR_CURSOR[0], pull);
            green = lerp(green, COLOR_CURSOR[1], pull);
            blue = lerp(blue, COLOR_CURSOR[2], pull);
            radius += pull * CURSOR_GROWTH;
            alpha = Math.min(1, alpha + pull * 0.5);
          }

          ctx.beginPath();
          ctx.fillStyle = `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${alpha})`;
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(0);
      return () => window.removeEventListener("resize", resize);
    }

    window.addEventListener("mousemove", onPointerMove);
    let animationId = 0;
    const loop = (time: number) => {
      animationId = requestAnimationFrame(loop);
      draw(time * WAVE_SPEED);
    };
    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "var(--bg)" }}
    />
  );
}
