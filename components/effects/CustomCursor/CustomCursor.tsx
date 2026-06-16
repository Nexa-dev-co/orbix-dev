"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Desktop-only custom cursor. Three layers:
 *  - dot  : 6px, follows the pointer almost instantly
 *  - ring : 36px outline, follows with lag for inertia
 *  - view : a 64px "VIEW →" pill that fades in over work cards
 *
 * Hover targets are declared declaratively in the markup:
 *  - [data-cursor="link"]  → ring scales up + fills accent
 *  - [data-cursor="view"]  → ring hides, the VIEW pill appears
 *
 * Hidden entirely on touch / coarse-pointer devices via CSS.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const view = viewRef.current!;

    // quickTo gives us a cheap, reusable tween per axis.
    const dotX = gsap.quickTo(dot, "x", { duration: 0.1, ease: "power3" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.1, ease: "power3" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3" });
    const viewX = gsap.quickTo(view, "x", { duration: 0.35, ease: "power3" });
    const viewY = gsap.quickTo(view, "y", { duration: 0.35, ease: "power3" });

    const move = (event: MouseEvent) => {
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);
      viewX(event.clientX);
      viewY(event.clientY);
    };

    const setLink = (active: boolean) =>
      gsap.to(ring, {
        scale: active ? 2.5 : 1,
        backgroundColor: active ? "rgba(0,229,255,0.25)" : "rgba(0,0,0,0)",
        borderColor: active ? "rgba(0,229,255,0.6)" : "var(--fg)",
        opacity: active ? 0.9 : 0.3,
        duration: 0.3,
        ease: "power2.out",
      });

    const setView = (active: boolean) => {
      gsap.to(view, {
        scale: active ? 1 : 0,
        opacity: active ? 1 : 0,
        duration: 0.35,
        ease: "power3.out",
      });
      gsap.to([dot, ring], {
        opacity: active ? 0 : (gsap.getProperty(ring, "opacity") as number),
        duration: 0.25,
      });
      // restore ring base opacity when leaving
      if (!active) gsap.set(ring, { opacity: 0.3 });
      gsap.set(dot, { opacity: active ? 0 : 1 });
    };

    // Event delegation: find the nearest element that opts into a cursor state.
    const over = (event: MouseEvent) => {
      const target = (event.target as HTMLElement)?.closest?.(
        "[data-cursor]"
      ) as HTMLElement | null;
      if (!target) return;
      const mode = target.dataset.cursor;
      if (mode === "view") setView(true);
      else if (mode === "link") setLink(true);
    };

    const out = (event: MouseEvent) => {
      const target = (event.target as HTMLElement)?.closest?.(
        "[data-cursor]"
      ) as HTMLElement | null;
      if (!target) return;
      const related = (event.relatedTarget as HTMLElement)?.closest?.(
        "[data-cursor]"
      );
      if (related === target) return; // still within the same target
      const mode = target.dataset.cursor;
      if (mode === "view") setView(false);
      else if (mode === "link") setLink(false);
    };

    window.addEventListener("mousemove", move);
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);

    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden />
      <div ref={dotRef} className="cursor-dot" aria-hidden />
      <div ref={viewRef} className="cursor-view font-display" aria-hidden>
        VIEW&nbsp;→
      </div>
    </>
  );
}
