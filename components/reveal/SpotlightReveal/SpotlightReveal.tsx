"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";

const DEFAULT_RADIUS = 190; // px — spotlight aperture radius
const EDGE_FEATHER = 26; // px — soft edge so the hole isn't a hard cut
const TRAIL_DURATION = 0.35; // s — spotlight lags the pointer slightly
const APERTURE_DURATION = 0.5; // s — open / close on enter / leave

/**
 * Cursor-spotlight reveal — the "helmet" interaction. `surface` covers
 * `beneath`; a circular mask that trails the pointer punches a hole in `surface`
 * so `beneath` shows through. The aperture position/size live in custom props
 * (--x / --y / --r) on the container, which the surface mask and the accent ring
 * both read. Pointer-only: on touch / reduced-motion the surface just shows in
 * full (no reveal), with `beneath` as the static fallback.
 */
export default function SpotlightReveal({
  surface,
  beneath,
  radius = DEFAULT_RADIUS,
}: {
  surface: ReactNode;
  beneath: ReactNode;
  radius?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    const bounds = container.getBoundingClientRect();
    gsap.set(container, { "--x": bounds.width / 2, "--y": bounds.height / 2, "--r": 0 });
    setEnabled(true);

    // quickTo gives the spotlight a cheap trailing follow per axis.
    const moveX = gsap.quickTo(container, "--x", { duration: TRAIL_DURATION, ease: "power3" });
    const moveY = gsap.quickTo(container, "--y", { duration: TRAIL_DURATION, ease: "power3" });

    const onMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      moveX(event.clientX - rect.left);
      moveY(event.clientY - rect.top);
    };
    const onEnter = () => {
      gsap.to(container, { "--r": radius, duration: APERTURE_DURATION, ease: "power3.out" });
      gsap.to(ringRef.current, { opacity: 0.55, duration: APERTURE_DURATION });
    };
    const onLeave = () => {
      gsap.to(container, { "--r": 0, duration: APERTURE_DURATION, ease: "power3.in" });
      gsap.to(ringRef.current, { opacity: 0, duration: APERTURE_DURATION });
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseenter", onEnter);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [radius]);

  // Transparent inside the aperture, opaque outside → punches the hole.
  const maskImage = `radial-gradient(circle at calc(var(--x) * 1px) calc(var(--y) * 1px), transparent calc(var(--r) * 1px), #000 calc(var(--r) * 1px + ${EDGE_FEATHER}px))`;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* hidden layer — revealed through the aperture */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>{beneath}</div>

      {/* surface layer — masked so the spotlight cuts through to `beneath` */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          ...(enabled ? { WebkitMaskImage: maskImage, maskImage } : null),
        }}
      >
        {surface}
      </div>

      {/* accent ring riding the aperture edge */}
      {enabled && (
        <div
          ref={ringRef}
          aria-hidden
          style={{
            position: "absolute",
            zIndex: 2,
            left: "calc(var(--x) * 1px)",
            top: "calc(var(--y) * 1px)",
            width: "calc(var(--r) * 2px)",
            height: "calc(var(--r) * 2px)",
            transform: "translate(-50%, -50%)",
            border: "1px solid var(--accent)",
            borderRadius: "9999px",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
