"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGsap } from "@/lib/hooks/useGsap";
import MagneticButton from "@/components/ui/MagneticButton";

const HEADLINE = [
  ["Your", "next", "chapter"],
  ["starts", "here."],
];

export default function CtaBanner() {
  const { scope, useScopedGsap } = useGsap<HTMLElement>();
  const leftWordRef = useRef<HTMLSpanElement>(null);
  const rightWordRef = useRef<HTMLSpanElement>(null);

  useScopedGsap(() => {
    gsap.from(".cta-word", {
      yPercent: 110,
      opacity: 0,
      duration: 0.9,
      stagger: 0.08,
      ease: "power3.out",
      scrollTrigger: {
        trigger: scope.current,
        start: "top 75%",
      },
    });

    gsap.from(".cta-fade", {
      y: 24,
      opacity: 0,
      duration: 0.9,
      stagger: 0.1,
      delay: 0.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: scope.current,
        start: "top 75%",
      },
    });

    // ── Parallax: the headline halves drift apart as the section enters ──
    gsap.to(leftWordRef.current, {
      x: -30,
      ease: "none",
      scrollTrigger: {
        trigger: scope.current,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.5,
      },
    });
    gsap.to(rightWordRef.current, {
      x: 30,
      ease: "none",
      scrollTrigger: {
        trigger: scope.current,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.5,
      },
    });

    ScrollTrigger.refresh();
  });

  return (
    <section
      ref={scope}
      id="contact"
      className="mx-auto max-w-[1400px] px-6 py-28 md:px-10 md:py-40"
    >
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-20">
        {/* Left: headline */}
        <h2
          className="font-display font-extrabold leading-[1.02]"
          style={{ fontSize: "clamp(34px,4.6vw,44px)", letterSpacing: "-1.5px" }}
        >
          {HEADLINE.map((line, li) => (
            <span
              key={li}
              ref={li === 0 ? leftWordRef : rightWordRef}
              className="block overflow-hidden"
            >
              {line.map((word) => (
                <span key={word} className="cta-word mr-[0.25em] inline-block">
                  <span
                    style={
                      word === "starts"
                        ? { color: "var(--accent)" }
                        : undefined
                    }
                  >
                    {word}
                  </span>
                </span>
              ))}
            </span>
          ))}
        </h2>

        {/* Right: body + CTA */}
        <div className="flex flex-col items-start gap-8">
          <p
            className="cta-fade max-w-[400px] text-[14px] leading-[1.9]"
            style={{ color: "var(--muted)" }}
          >
            Whether you&rsquo;re a founder with a napkin sketch or a brand ready
            for a full redesign — let&rsquo;s figure out what this should feel
            like.
          </p>
          <MagneticButton className="cta-fade" strength={0.4}>
            <a
              href="mailto:hello@stud.io"
              data-cursor="link"
              className="inline-block text-[14px] text-white transition-transform duration-300 hover:scale-[1.03]"
              style={{
                background: "var(--accent)",
                borderRadius: 100,
                padding: "14px 28px",
              }}
            >
              Start a conversation →
            </a>
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
