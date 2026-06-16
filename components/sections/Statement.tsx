"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Stat = {
  value: number;
  decimals: number;
  suffix: string;
  label: string;
};

const STATS: Stat[] = [
  { value: 80, decimals: 0, suffix: "+", label: "Projects launched" },
  { value: 6, decimals: 0, suffix: " yr", label: "In the craft" },
  { value: 4.9, decimals: 1, suffix: "★", label: "Client rating" },
];

// Format the live counter value with the right precision and suffix.
const formatStat = (v: number, stat: Stat) =>
  (stat.decimals ? v.toFixed(stat.decimals) : Math.round(v).toString()) +
  stat.suffix;

export default function Statement() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const stat1Ref = useRef<HTMLSpanElement>(null);
  const stat2Ref = useRef<HTMLSpanElement>(null);
  const stat3Ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);
  const statRefList = [stat1Ref, stat2Ref, stat3Ref];

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
          start: "top 75%",
          end: "top 30%",
        };

        gsap.from(".stmt-word", {
          x: -40,
          opacity: 0,
          stagger: 0.1,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: trigger,
        });

        gsap.from(".stmt-line", {
          y: 30,
          opacity: 0,
          stagger: 0.08,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: trigger,
        });

        // ── Multi-speed parallax: left column drifts slower than the right ──
        gsap.to(leftColRef.current, {
          y: -40,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          },
        });
        gsap.to(rightColRef.current, {
          y: -80,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          },
        });

        ScrollTrigger.refresh();
      }, sectionRef);
    }, 100);

    return () => {
      clearTimeout(timer);
      ctx?.revert();
    };
  }, []);

  // ── Stat counters — fire once when the first stat scrolls into view ──
  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: stat1Ref.current,
      start: "top 85%",
      onEnter: () => {
        if (triggered.current) return;
        triggered.current = true;

        // Counter 1: 80+
        const obj1 = { val: 0 };
        gsap.to(obj1, {
          val: 80,
          duration: 2.2,
          ease: "power2.out",
          onUpdate: () => {
            if (stat1Ref.current)
              stat1Ref.current.textContent = Math.round(obj1.val) + "+";
          },
        });

        // Counter 2: 6 yr
        const obj2 = { val: 0 };
        gsap.to(obj2, {
          val: 6,
          duration: 2,
          ease: "power2.out",
          delay: 0.2,
          onUpdate: () => {
            if (stat2Ref.current)
              stat2Ref.current.textContent = Math.round(obj2.val) + " yr";
          },
        });

        // Counter 3: 4.9★
        const obj3 = { val: 0 };
        gsap.to(obj3, {
          val: 4.9,
          duration: 2,
          ease: "power2.out",
          delay: 0.4,
          onUpdate: () => {
            if (stat3Ref.current)
              stat3Ref.current.textContent = obj3.val.toFixed(1) + "★";
          },
        });
      },
    });
    return () => trigger.kill();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="studio"
      className="mx-auto max-w-[1400px] px-6 py-28 md:px-10 md:py-40"
    >
      <div className="grid grid-cols-1 items-end gap-12 md:grid-cols-2 md:gap-20">
        {/* Left column */}
        <div ref={leftColRef}>
          <p className="eyebrow mb-8" style={{ color: "var(--muted)" }}>
            <span className="stmt-word inline-block">01 — Who we are</span>
          </p>
          <h2
            className="font-display font-bold leading-[1.05]"
            style={{ fontSize: "clamp(30px,4vw,40px)", letterSpacing: "-1px" }}
          >
            <span className="stmt-word block">Not a vendor.</span>
            <span
              className="stmt-word block font-normal italic"
              style={{ color: "var(--muted)" }}
            >
              A creative partner
            </span>
            <span className="stmt-word block">with an obsession.</span>
          </h2>
        </div>

        {/* Right column */}
        <div ref={rightColRef} className="flex flex-col gap-6">
          <p
            className="stmt-line text-[14px] leading-[1.9]"
            style={{ color: "var(--muted)" }}
          >
            We&rsquo;re a small, fiercely focused studio that believes the web
            is still the{" "}
            <span style={{ color: "var(--fg)", fontWeight: 500 }}>
              most powerful storytelling medium
            </span>{" "}
            ever built. Most agencies forgot that. We didn&rsquo;t.
          </p>
          <p
            className="stmt-line text-[14px] leading-[1.9]"
            style={{ color: "var(--muted)" }}
          >
            Every project starts with one question:{" "}
            <span style={{ color: "var(--fg)", fontWeight: 500 }}>
              what should this feel like?
            </span>{" "}
            Then we build backwards from that feeling — through design, code,
            motion, and language — until the screen delivers it.
          </p>

          {/* Stats */}
          <div
            className="stmt-line mt-6 grid grid-cols-3 gap-4 pt-6"
            style={{ borderTop: "0.5px solid var(--border)" }}
          >
            {STATS.map((stat, i) => (
              <div key={stat.label}>
                <div className="font-display text-[28px] font-bold">
                  <span ref={statRefList[i]}>{formatStat(0, stat)}</span>
                </div>
                <div
                  className="mt-1 text-[10px] uppercase"
                  style={{ letterSpacing: "1.5px", color: "var(--muted)" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
