"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    num: "01",
    title: "Discover & Define",
    body: "We dig into your world — users, goals, edge cases — until the problem feels obvious.",
  },
  {
    num: "02",
    title: "Design & Prototype",
    body: "High-fidelity concepts fast. You see and feel the product before a single line of code.",
  },
  {
    num: "03",
    title: "Build & Animate",
    body: "Clean, performant code. Motion that earns its place. Nothing decorative, everything intentional.",
  },
  {
    num: "04",
    title: "Launch & Evolve",
    body: "We ship, then stay. Iteration, analytics, and continuous refinement built into every engagement.",
  },
];

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const borderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const numRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const bodyRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    let ctx: gsap.Context | undefined;

    // Defer one tick so Lenis + ScrollTrigger are wired before we build triggers.
    const timer = setTimeout(() => {
      ctx = gsap.context(() => {
        const trigger = {
          trigger: sectionRef.current,
          start: "top 65%",
          once: true,
        };

        // Hide the elements that animate in after their border draws.
        gsap.set(borderRefs.current, { scaleX: 0, transformOrigin: "left" });
        gsap.set(
          [...numRefs.current, ...titleRefs.current, ...bodyRefs.current],
          { y: 20, opacity: 0 }
        );

        // ── Parallax: the intro heading drifts left while scrolling through ──
        gsap.to(headingRef.current, {
          x: -60,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 2,
          },
        });

        // 1) Border lines draw left → right, staggered across the row.
        gsap.to(borderRefs.current, {
          scaleX: 1,
          duration: 0.9,
          ease: "power3.inOut",
          stagger: 0.18,
          scrollTrigger: trigger,
        });

        // 2/3/4) Number, then title, then body fade up — each card's content
        //    sequenced after its own border finishes for a "written live" feel.
        STEPS.forEach((_, index) => {
          const baseDelay = index * 0.18 + 0.6;
          gsap.to(numRefs.current[index], {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            delay: baseDelay,
            scrollTrigger: trigger,
          });
          gsap.to(titleRefs.current[index], {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            delay: baseDelay + 0.15,
            scrollTrigger: trigger,
          });
          gsap.to(bodyRefs.current[index], {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            delay: baseDelay + 0.3,
            scrollTrigger: trigger,
          });
        });

        ScrollTrigger.refresh();
      }, sectionRef);
    }, 100);

    return () => {
      clearTimeout(timer);
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="process"
      className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28"
    >
      {/* Intro */}
      <div ref={headingRef} className="mb-16 max-w-[460px]">
        <p className="eyebrow mb-5" style={{ color: "var(--muted)" }}>
          03 — How we work
        </p>
        <h2
          className="font-display text-[28px] font-bold leading-[1.1]"
          style={{ letterSpacing: "-0.5px" }}
        >
          Four chapters. One finished world.
        </h2>
        <p
          className="mt-5 text-[14px] leading-[1.9]"
          style={{ color: "var(--muted)" }}
        >
          We run lean, move fast, and stay in the room with you. No handoffs to
          juniors, no black-box processes.
        </p>
      </div>

      {/* Grid */}
      <div className="process-grid grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <div key={step.num} className="process-card">
            <div
              className="card-border-line"
              ref={(element) => {
                borderRefs.current[index] = element;
              }}
              style={{
                height: 1,
                width: "100%",
                background: "var(--accent)",
                transform: "scaleX(0)",
                transformOrigin: "left",
                marginBottom: 28,
              }}
            />
            <div
              className="mb-4 font-display text-[13px] font-bold"
              style={{ color: "var(--muted)" }}
              ref={(element) => {
                numRefs.current[index] = element;
              }}
            >
              {step.num}
            </div>
            <h3
              className="mb-3 font-display text-[18px] font-bold leading-tight"
              ref={(element) => {
                titleRefs.current[index] = element;
              }}
            >
              {step.title}
            </h3>
            <p
              className="text-[13px] leading-[1.8]"
              style={{ color: "var(--muted)" }}
              ref={(element) => {
                bodyRefs.current[index] = element;
              }}
            >
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
