"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

interface Value {
  title: string;
  description: string;
}

const VALUES: Value[] = [
  {
    title: "Performance is a feature",
    description:
      "Speed and responsiveness aren't polish — they're the experience. We treat them as requirements, not afterthoughts.",
  },
  {
    title: "Craft over shortcuts",
    description:
      "We sweat the details others skip, because the difference between good and great lives in the last 10%.",
  },
  {
    title: "Motion with meaning",
    description:
      "Every animation earns its place. If it doesn't guide, delight, or clarify, it doesn't ship.",
  },
  {
    title: "Build to last",
    description:
      "Clear architecture and honest code, so what we build stays maintainable long after launch.",
  },
];

export default function ValuesSection() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section ref={sectionRef} className="border-y border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <h2
          data-reveal
          className="font-display text-3xl font-bold tracking-tight text-text md:text-4xl"
        >
          What we value
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
          {VALUES.map((value, valueIndex) => (
            <div data-reveal key={value.title} className="flex gap-5">
              <span className="font-mono text-sm text-accent">
                {String(valueIndex + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-text">
                  {value.title}
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-text-muted">
                  {value.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
