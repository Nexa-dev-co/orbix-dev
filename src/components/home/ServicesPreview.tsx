"use client";

import Link from "next/link";
import { SERVICES } from "@/lib/services";
import ServiceCard from "@/components/services/ServiceCard";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const PREVIEW_COUNT = 3;

// Homepage capabilities teaser — first few services, full list on /services.
export default function ServicesPreview() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      className="mx-auto w-full max-w-6xl px-6 py-28 md:py-36"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p
            data-reveal
            className="font-mono text-xs uppercase tracking-[0.3em] text-accent"
          >
            What we do
          </p>
          <h2
            data-reveal
            className="mt-4 font-display text-3xl font-bold tracking-tight text-text md:text-5xl"
          >
            Capabilities
          </h2>
        </div>
        <Link
          data-reveal
          href="/services"
          className="font-body text-sm text-text-muted transition-colors duration-200 hover:text-accent"
        >
          All services →
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {SERVICES.slice(0, PREVIEW_COUNT).map((service) => (
          <div data-reveal key={service.title}>
            <ServiceCard service={service} />
          </div>
        ))}
      </div>
    </section>
  );
}
