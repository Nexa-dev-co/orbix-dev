"use client";

import { useEffect, useRef } from "react";

export type CanvasVariant = "orion" | "volta" | "flux" | "apex";

/**
 * Generative "video loop" background for a work card, drawn on a <canvas>.
 * Each variant has its own atmospheric animation. The loop pauses via
 * IntersectionObserver when the card scrolls out of view (perf rule 2) and
 * resumes on re-entry. The animId is always cancelled on unmount.
 */
export default function WorkCardCanvas({
  variant,
  className,
}: {
  variant: CanvasVariant;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const sizeCanvas = () => {
      canvas.width = canvas.offsetWidth || 480;
      canvas.height = canvas.offsetHeight || 560;
    };
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    const draw = makeDrawer(variant, canvas, ctx);

    // Paint a single static frame for reduced-motion users.
    if (prefersReduced) {
      draw(0);
      return () => window.removeEventListener("resize", sizeCanvas);
    }

    let animId = 0;
    let start = performance.now();
    let running = false;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      draw((now - start) / 1000);
    };
    const startLoop = () => {
      if (running) return;
      running = true;
      start = performance.now();
      animId = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(animId);
    };

    // Only animate while the card is on screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startLoop();
        else stopLoop();
      },
      { threshold: 0.01 }
    );
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      io.disconnect();
      window.removeEventListener("resize", sizeCanvas);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

/* ─────────────────────────────────────────────
   Per-variant drawing functions. Each returns a
   draw(t) where t is elapsed seconds.
───────────────────────────────────────────── */
function makeDrawer(
  variant: CanvasVariant,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
) {
  switch (variant) {
    case "orion":
      return makeOrion(canvas, ctx);
    case "volta":
      return makeVolta(canvas, ctx);
    case "flux":
      return makeFlux(canvas, ctx);
    case "apex":
      return makeApex(canvas, ctx);
  }
}

// Card 1 — flowing orange particles that occasionally align into a grid.
function makeOrion(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const N = 60;
  const parts = Array.from({ length: N }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    speed: 0.3 + Math.random() * 0.7,
    gx: 0,
    gy: 0,
  }));
  // Precompute a grid target for the "align" phase.
  const cols = 8;
  parts.forEach((p, i) => {
    const rows = Math.ceil(N / cols);
    p.gx = ((i % cols) + 0.5) * (canvas.width / cols);
    p.gy = (Math.floor(i / cols) + 0.5) * (canvas.height / rows);
  });

  return (t: number) => {
    // Trail: translucent background fill instead of clear.
    ctx.fillStyle = "rgba(13,4,0,0.06)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Every 4s, spend ~1s aligned to the grid.
    const phase = t % 4;
    const aligning = phase > 3;

    ctx.fillStyle = "rgba(255,80,20,0.6)";
    for (const p of parts) {
      if (aligning) {
        p.x += (p.gx - p.x) * 0.08;
        p.y += (p.gy - p.y) * 0.08;
      } else {
        p.y -= p.speed;
        if (p.y < 0) {
          p.y = canvas.height;
          p.x = Math.random() * canvas.width;
        }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

// Card 2 — horizontal scan lines sweeping over a faint product grid.
function makeVolta(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  return (t: number) => {
    const { width: w, height: h } = canvas;
    ctx.fillStyle = "#00060F";
    ctx.fillRect(0, 0, w, h);

    // Faint product-card grid suggesting a storefront layout.
    ctx.strokeStyle = "rgba(30,100,255,0.12)";
    ctx.lineWidth = 1;
    const gx = 3;
    const gy = 4;
    const pad = 24;
    const cw = (w - pad * 2) / gx;
    const ch = (h - pad * 2) / gy;
    for (let i = 0; i < gx; i++) {
      for (let j = 0; j < gy; j++) {
        ctx.strokeRect(pad + i * cw + 4, pad + j * ch + 4, cw - 8, ch - 8);
      }
    }

    // Scan sweep travels left → right every 3s, revealing the grid.
    const p = (t % 3) / 3;
    const sx = p * w;
    const grad = ctx.createLinearGradient(sx - 60, 0, sx + 10, 0);
    grad.addColorStop(0, "rgba(30,100,255,0)");
    grad.addColorStop(1, "rgba(30,100,255,0.4)");
    ctx.fillStyle = grad;
    ctx.fillRect(sx - 60, 0, 70, h);
    ctx.strokeStyle = "rgba(80,150,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  };
}

// Card 3 — concentric sonar pings from the centre.
function makeFlux(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  return (t: number) => {
    const { width: w, height: h } = canvas;
    ctx.fillStyle = "#050010";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(w * w + h * h) / 2;
    const RINGS = 5;
    const PERIOD = 2.5;

    ctx.lineWidth = 1;
    for (let i = 0; i < RINGS; i++) {
      let phase = ((t - i * 0.4) % PERIOD) / PERIOD;
      if (phase < 0) phase += 1;
      const r = phase * maxR;
      const alpha = (1 - phase) * 0.3;
      ctx.strokeStyle = `rgba(120,40,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  };
}

// Card 4 — scrambled characters that resolve into "APEX".
function makeApex(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const WORD = "APEX";
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // Stable random jitter origins per slot.
  const jitter = WORD.split("").map(() => ({
    x: Math.random(),
    y: Math.random(),
  }));

  return (t: number) => {
    const { width: w, height: h } = canvas;
    ctx.fillStyle = "#001A0A";
    ctx.fillRect(0, 0, w, h);

    ctx.font = "800 48px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const CYCLE = 6; // seconds: scramble → resolve → hold → restart
    const local = t % CYCLE;
    const resolve = Math.min(Math.max((local - 1) / 1.5, 0), 1); // 0→1

    const spacing = 52;
    const startX = w / 2 - ((WORD.length - 1) * spacing) / 2;
    const finalY = h / 2;

    for (let i = 0; i < WORD.length; i++) {
      const fx = startX + i * spacing;
      // Scrambled origin drifts in from a random spot.
      const ox = jitter[i].x * w;
      const oy = jitter[i].y * h;
      const x = ox + (fx - ox) * resolve;
      const y = oy + (finalY - oy) * resolve;

      const settled = resolve > 0.95;
      const char = settled
        ? WORD[i]
        : ALPHABET[Math.floor((t * 12 + i * 7) % ALPHABET.length)];
      const alpha = 0.5 * (0.3 + 0.7 * resolve);
      ctx.fillStyle = `rgba(30,180,80,${alpha})`;
      ctx.fillText(char, x, y);
    }
  };
}
