import type { Service } from "@/lib/services";

interface ServiceCardProps {
  service: Service;
}

/*
  Self-contained service card. Border lights up in accent on hover with a soft
  glow halo (no modal — each card stands alone, per the services spec).
*/
export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="group relative h-full rounded-lg border border-border bg-surface p-8 transition-colors duration-300 hover:border-accent">
      {/* Glow halo, revealed on hover. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: "0 0 48px var(--color-accent-glow)" }}
      />
      <h3 className="font-display text-xl font-semibold text-text">
        {service.title}
      </h3>
      <p className="mt-3 font-body text-sm leading-relaxed text-text-muted">
        {service.summary}
      </p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {service.capabilities.map((capability) => (
          <li
            key={capability}
            className="rounded-full border border-border px-3 py-1 font-mono text-xs text-text-muted"
          >
            {capability}
          </li>
        ))}
      </ul>
    </article>
  );
}
