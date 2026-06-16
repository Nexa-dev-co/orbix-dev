"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroCanvas from "@/components/canvas/HeroCanvas";
import MagneticButton from "@/components/ui/MagneticButton";
import { SplitChars } from "@/lib/splitChars";

gsap.registerPlugin(ScrollTrigger);

const LINE_STYLE = {
  fontSize: "clamp(44px, 8vw, 72px)",
  letterSpacing: "-3px",
} as const;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    let ctx: gsap.Context | undefined;

    // Defer one tick so Lenis + ScrollTrigger are wired before we build triggers.
    const timer = setTimeout(() => {
      ctx = gsap.context(() => {
        // ── Character-level headline reveal (rises from the line mask) ──
        const chars = heroRef.current!.querySelectorAll(".char");
        gsap.fromTo(
          chars,
          { y: "110%", rotateZ: 3 },
          {
            y: "0%",
            rotateZ: 0,
            duration: 0.9,
            ease: "power4.out",
            stagger: 0.022,
            delay: 0.9, // after the page loader lifts
          }
        );

        // ── Eyebrow + subtext/CTA fade in, after the headline ──
        gsap.from(".hero-eyebrow", {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          delay: 1.0,
        });
        gsap.from(".hero-fade", {
          y: 24,
          opacity: 0,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          delay: 1.5,
        });

        // ── Ghost watermark parallax — drifts up and slowly scales ──
        gsap.to(ghostRef.current, {
          yPercent: -35,
          scale: 1.08,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        });

        // ── CTA buttons drift down slightly as the hero scrolls away ──
        gsap.to(ctaRef.current, {
          y: 30,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });

        // ── Scroll indicator line draw ──
        gsap.from(".hero-scroll-line", {
          scaleY: 0,
          transformOrigin: "top",
          duration: 1,
          delay: 1.6,
          ease: "power2.out",
        });

        ScrollTrigger.refresh();
      }, heroRef);
    }, 100);

    return () => {
      clearTimeout(timer);
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={heroRef}
      id="top"
      className="relative flex min-h-[100svh] w-full items-center overflow-hidden px-6 pt-[68px] md:px-10"
    >
      {/* Living WebGL particle field, behind everything */}
      <HeroCanvas />

      {/* Ghost / watermark word — centered via flex wrapper so GSAP fully
          owns the transform on the inner <span> (no CSS translate to fight) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
        aria-hidden
      >
        <span
          ref={ghostRef}
          className="hero-ghost select-none font-display font-extrabold leading-none"
          style={{
            fontSize: "clamp(120px, 28vw, 360px)",
            color: "rgba(255,255,255,0.018)",
            letterSpacing: "-0.04em",
          }}
        >
          BUILD
        </span>
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center">
        {/* Eyebrow */}
        <div className="hero-eyebrow mb-10 flex items-center gap-3">
          <span
            className="block h-px w-10"
            style={{ background: "var(--accent)" }}
          />
          <span className="eyebrow text-fg/80">Full-spectrum web studio</span>
        </div>

        {/* Headline — character-level mask reveal */}
        <h1 className="font-display font-extrabold leading-[0.95]">
          <span className="line-mask">
            <span className="inline-block" style={LINE_STYLE}>
              <SplitChars text={"We don’t build"} />
            </span>
          </span>
          <span className="line-mask md:pl-20">
            <span
              className="inline-block italic"
              style={{ ...LINE_STYLE, color: "var(--muted)" }}
            >
              <SplitChars text="websites." />
            </span>
          </span>
          <span className="line-mask">
            <span className="inline-block" style={LINE_STYLE}>
              <SplitChars text="We build " />
              <span style={{ color: "var(--accent)" }}>
                <SplitChars text="worlds." />
              </span>
            </span>
          </span>
        </h1>

        {/* Bottom row: subtext (left) + CTAs (right) */}
        <div className="mt-16 flex flex-col gap-10 md:mt-24 md:flex-row md:items-end md:justify-between">
          <p
            className="hero-fade max-w-[300px] text-[14px] leading-[1.85]"
            style={{ color: "var(--muted)" }}
          >
            SaaS products, commerce platforms, campaigns and mobile-first apps
            — designed to make people feel something.
          </p>

          {/* ctaRef wrapper handles scroll parallax; inner handles entrance */}
          <div ref={ctaRef}>
            <div className="hero-fade flex flex-wrap items-center gap-3">
              <MagneticButton strength={0.4}>
                <a
                  href="#work"
                  data-cursor="link"
                  className="inline-block rounded-full px-6 py-3 text-[13px] text-white transition-transform duration-300 hover:scale-[1.03]"
                  style={{ background: "var(--accent)" }}
                >
                  See our work
                </a>
              </MagneticButton>
              <a
                href="#process"
                data-cursor="link"
                className="rounded-full px-6 py-3 text-[13px] text-fg transition-colors duration-300 hover:bg-white/5"
                style={{ border: "0.5px solid var(--border)" }}
              >
                How we think
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Vertical scroll indicator */}
      <div className="hero-fade absolute bottom-8 right-6 z-10 hidden flex-col items-center gap-3 md:right-10 md:flex">
        <span
          className="eyebrow rotate-180 text-fg/50"
          style={{ writingMode: "vertical-rl" }}
        >
          Scroll
        </span>
        <span
          className="hero-scroll-line block h-12 w-px"
          style={{ background: "var(--border)" }}
        />
      </div>
    </section>
  );
}
