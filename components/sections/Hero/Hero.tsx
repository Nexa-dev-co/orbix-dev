'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SunCanvas = dynamic(() => import('./SunCanvas'), { ssr: false });

// ── Scroll constants ────────────────────────────────────────────────
const SCROLL_SCRUB = 1.8;
const SCROLL_END   = '+=220%';

// ── Blob / cursor-reveal constants ──────────────────────────────────
const BLOB_MIN_DIST    = 12;    // px of cursor travel before spawning a new blob
const BLOB_BASE_RADIUS = 90;    // baseline max radius (reduced from 115)
const BLOB_SPEED_BONUS = 55;    // extra radius at max speed (reduced from 75)
const BLOB_GROW_RATE   = 3.5;   // px growth per frame
const BLOB_FADE_RATE   = 0.025; // alpha loss per frame once fully grown (was 0.007)
const BLOB_POINTS      = 20;    // polygon subdivisions for organic shape

// Sine-wave frequencies + amplitudes for the organic deformation
const DEFORM_FREQ = [2, 3, 5, 7] as const;
const DEFORM_AMP  = [0.18, 0.10, 0.06, 0.03] as const;

interface Blob {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  seed: number;
  growing: boolean;
}

// ── Draw one organic blob + galaxy interior ─────────────────────────
function paintBlob(ctx: CanvasRenderingContext2D, blob: Blob) {
  const { x, y, radius, alpha, seed } = blob;

  // Build a sine-deformed polygon path for the organic "water" shape
  ctx.beginPath();
  for (let i = 0; i <= BLOB_POINTS; i++) {
    const angle   = (i / BLOB_POINTS) * Math.PI * 2;
    const deform  = DEFORM_FREQ.reduce(
      (acc, freq, fi) => acc + DEFORM_AMP[fi] * Math.sin(angle * freq + seed * (fi + 1)),
      0,
    );
    const r  = radius * (1 + deform);
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else         ctx.lineTo(px, py);
  }
  ctx.closePath();

  ctx.save();
  ctx.clip(); // everything below stays inside the organic shape

  // Deep-space gradient fill — use white for mix-blend-mode: difference
  // White on a light bg → inverts to dark. White on dark text → inverts to light.
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.25);
  grad.addColorStop(0.00, `rgba(255, 255, 255, ${alpha})`);
  grad.addColorStop(0.55, `rgba(255, 255, 255, ${alpha * 0.84})`);
  grad.addColorStop(0.85, `rgba(255, 255, 255, ${alpha * 0.32})`);
  grad.addColorStop(1.00, `rgba(255, 255, 255, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius * 1.6, y - radius * 1.6, radius * 3.2, radius * 3.2);

  // Stars — golden-angle phyllotaxis for natural scatter
  const starCount = Math.floor(radius * 0.55);
  for (let i = 0; i < starCount; i++) {
    const phi  = (seed * 11.3 + i * 137.508) * (Math.PI / 180);
    const dist = Math.sqrt((i + 1) / starCount) * radius * 0.9;
    const sx   = x + dist * Math.cos(phi);
    const sy   = y + dist * Math.sin(phi);
    const sr   = ((seed * (i * 0.07 + 0.4)) % 1) * 1.0 + 0.12;
    const sa   = (((seed + i) * 0.11) % 1) * 0.4 + 0.15;

    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    // Use a darker shade so it shows through the difference blend
    ctx.fillStyle = `rgba(40, 50, 80, ${sa * Math.min(alpha * 1.5, 1)})`;
    ctx.fill();
  }

  // A handful of brighter feature stars with a tiny soft halo
  const featureCount = Math.floor(radius * 0.05);
  for (let i = 0; i < featureCount; i++) {
    const phi  = (seed * 7.7 + i * 222.5) * (Math.PI / 180);
    const dist = Math.sqrt((i + 1) / featureCount) * radius * 0.75;
    const fx   = x + dist * Math.cos(phi);
    const fy   = y + dist * Math.sin(phi);
    const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 3.5);
    halo.addColorStop(0, `rgba(40, 50, 80, ${alpha * 0.5})`);
    halo.addColorStop(1, 'rgba(40, 50, 80, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(fx - 3.5, fy - 3.5, 7, 7);
    ctx.beginPath();
    ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(20, 25, 50, ${alpha * 0.85})`;
    ctx.fill();
  }

  ctx.restore();
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);
  const revealRef  = useRef<HTMLCanvasElement>(null);

  // ── Cursor reveal ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = revealRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const blobs: Blob[] = [];
    let lastX = -999;
    let lastY = -999;

    const onMove = (e: MouseEvent) => {
      const dx   = e.clientX - lastX;
      const dy   = e.clientY - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < BLOB_MIN_DIST) return;

      const speed = Math.min(dist, 60) / 60;
      blobs.push({
        x:         e.clientX,
        y:         e.clientY,
        radius:    14,
        maxRadius: BLOB_BASE_RADIUS + speed * BLOB_SPEED_BONUS + Math.random() * 25,
        alpha:     0.85,
        seed:      Math.random() * 1000,
        growing:   true,
      });
      lastX = e.clientX;
      lastY = e.clientY;
    };

    let rafId: number;
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = blobs.length - 1; i >= 0; i--) {
        const b = blobs[i];
        if (b.growing) {
          b.radius += BLOB_GROW_RATE;
          if (b.radius >= b.maxRadius) b.growing = false;
        } else {
          b.alpha -= BLOB_FADE_RATE;
        }
        if (b.alpha <= 0) { blobs.splice(i, 1); continue; }
        paintBlob(ctx, b);
      }
    };
    loop();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // ── Entrance + scroll ────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const card    = cardRef.current;
    if (!section || !card) return;

    // Compute scale so the card covers the full viewport at scroll end.
    // We use the diagonal to ensure full coverage at any aspect ratio.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const diagonal    = Math.sqrt(vw * vw + vh * vh);
    const targetScale = (diagonal / 175) * 1.25; // generous overshoot

    // Entrance
    gsap.fromTo(
      '[data-hero-text]',
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, stagger: 0.11, duration: 0.95, delay: 0.45, ease: 'power3.out' },
    );
    gsap.fromTo(
      '[data-hero-card]',
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 1.05, delay: 0.7, ease: 'power3.out' },
    );

    // Scroll: grow the card in place until it fills the viewport
    const scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: SCROLL_END,
        pin: true,
        scrub: SCROLL_SCRUB,
        anticipatePin: 1,
      },
    });

    // Phase 1 (0–70%): scale up the card and fade out text + tagline
    scrollTl.to(card, {
      scale: targetScale,
      borderRadius: 0,
      zIndex: 50,
      ease: 'power1.in',
      duration: 1,
    }, 0);

    // Fade out the hero text as the card grows (first 40% of timeline)
    scrollTl.to('[data-hero-text]', {
      opacity: 0,
      duration: 0.4,
      ease: 'power1.in',
    }, 0);

    // Fade out the tagline
    scrollTl.to('.hero-sub', {
      opacity: 0,
      duration: 0.3,
      ease: 'power1.in',
    }, 0);

    return () => {
      scrollTl.scrollTrigger?.kill();
      scrollTl.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} className="hero-section">

      {/* Galaxy reveal — canvas sits above bg, below content */}
      <canvas ref={revealRef} className="hero-reveal-canvas" aria-hidden="true" />

      {/* Title centred in the flex column */}
      <div className="hero-main">
        <div
          className="hero-title-group"
          role="heading"
          aria-level={1}
          aria-label="we build worlds"
        >
          <p
            className="hero-line-top"
            data-hero-text
            style={{ opacity: 0 }}
          >
            we build
          </p>

          <div className="hero-line-bottom">
            <span
              className="hero-letter"
              data-hero-text
              style={{ opacity: 0 }}
            >
              W
            </span>

            {/* The sun square — GSAP scales this on scroll */}
            <div
              ref={cardRef}
              className="hero-sun-card"
              data-hero-card
              style={{ opacity: 0 }}
            >
              <SunCanvas />
            </div>

            <span
              className="hero-letter"
              data-hero-text
              style={{ opacity: 0 }}
            >
              rlds
            </span>
          </div>
        </div>
      </div>

      {/* Tagline — natural bottom item in the flex column */}
      <p
        className="hero-sub"
        data-hero-text
        style={{ opacity: 0 }}
      >
        software with its own gravity
      </p>

    </section>
  );
}
