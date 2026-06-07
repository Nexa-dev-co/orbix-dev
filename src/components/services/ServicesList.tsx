"use client";

import { SERVICES } from "@/lib/services";
import ServiceCard from "./ServiceCard";
import { useScrollReveal } from "@/hooks/useScrollReveal";

// Full bento-style grid of every service, revealed on scroll.
export default function ServicesList() {
  const gridRef = useScrollReveal<HTMLDivElement>({ stagger: 0.08 });

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {SERVICES.map((service) => (
        <div data-reveal key={service.title}>
          <ServiceCard service={service} />
        </div>
      ))}
    </div>
  );
}
