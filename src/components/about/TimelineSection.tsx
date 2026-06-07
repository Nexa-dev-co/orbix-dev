"use client";

import { useEffect, useRef } from "react";
import { registerGsap, gsap } from "@/lib/gsap-config";

interface Milestone {
  year: string;
  title: string;
  description: string;
}

const MILESTONES: Milestone[] = [
  {
    year: "2017",
    title: "Nexa founded",
    description: "Three engineers and a designer, betting that performance and craft could be the same thing.",
  },
  {
    year: "2019",
    title: "First WebGL product",
    description: "Our shader and motion work shipped to production — and the studio found its signature.",
  },
  {
    year: "2021",
    title: "The team doubles",
    description: "Strategy, design, and performance specialists joined to take projects end-to-end.",
  },
  {
    year: "2024",
    title: "Studio of record",
    description: "Trusted by teams who care as much about the last 10% as we do.",
  },
];

/*
  Founding timeline with a ScrollTrigger line-draw: the accent line scrubs from
  0 to full height as the section scrolls through, and milestones reveal in.
*/
export default function TimelineSection() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const timelineContainer = timelineRef.current;
    const line = lineRef.current;
    if (!timelineContainer || !line) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          transformOrigin: "top center",
          scrollTrigger: {
            trigger: timelineContainer,
            start: "top 65%",
            end: "bottom 75%",
            scrub: true,
          },
        }
      );
      gsap.from("[data-reveal]", {
        opacity: 0,
        x: -20,
        duration: 0.7,
        ease: "expo.out",
        stagger: 0.2,
        scrollTrigger: { trigger: timelineContainer, start: "top 65%" },
      });
    }, timelineContainer);

    return () => context.revert();
  }, []);

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-24">
      <h2 className="font-display text-3xl font-bold tracking-tight text-text md:text-4xl">
        Our story
      </h2>
      <div ref={timelineRef} className="relative mt-12">
        {/* The line that draws as you scroll. */}
        <div ref={lineRef} className="absolute bottom-1 left-2 top-1 w-px bg-accent" />
        <ul className="space-y-12">
          {MILESTONES.map((milestone) => (
            <li data-reveal key={milestone.year} className="relative pl-10">
              <span className="absolute left-2 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-accent bg-bg" />
              <span className="font-mono text-sm text-accent">
                {milestone.year}
              </span>
              <h3 className="mt-1 font-display text-xl font-semibold text-text">
                {milestone.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-text-muted">
                {milestone.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
