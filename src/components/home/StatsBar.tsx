"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: "60+", label: "Products shipped" },
  { value: "12", label: "Specialists" },
  { value: "9yrs", label: "Avg. experience" },
  { value: "98", label: "Median Lighthouse" },
];

// Compact metrics band between sections.
export default function StatsBar() {
  const sectionRef = useScrollReveal<HTMLElement>({ stagger: 0.08 });

  return (
    <section ref={sectionRef} className="border-y border-border">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-y-10 px-6 py-16 md:grid-cols-4">
        {STATS.map((stat) => (
          <div data-reveal key={stat.label} className="text-center md:text-left">
            <p className="font-display text-4xl font-bold text-text md:text-5xl">
              {stat.value}
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
