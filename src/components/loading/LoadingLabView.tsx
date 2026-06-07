"use client";

import { useState } from "react";
import { LOADING_VARIANTS } from "./variants/variants-registry";

/*
  TEMP dev tool. A gallery of loading variants — click a card to play that
  overlay over this page; each variant reveals these cards again when it
  finishes, so you can compare them back-to-back. Delete this view (and
  /loading-lab) once a variant is chosen.
*/
export default function LoadingLabView() {
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  const activeVariant = LOADING_VARIANTS.find(
    (variant) => variant.id === activeVariantId
  );
  const ActiveVariantComponent = activeVariant?.Component;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-28 md:py-36">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        Temp · Loading Lab
      </p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-text md:text-5xl">
        Choose a loading sequence
      </h1>
      <p className="mt-4 max-w-2xl font-body text-base text-text-muted">
        Click a card to play that variant over this page. It reveals these cards
        again when it finishes. Hard-refreshing here? Append{" "}
        <code className="font-mono text-text">?skip_loading=1</code> to skip the
        site&apos;s own boot overlay.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LOADING_VARIANTS.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => setActiveVariantId(variant.id)}
            className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-6 text-left transition-colors duration-200 hover:border-accent hover:bg-surface-mid"
          >
            <span className="flex items-center justify-between">
              <span className="font-display text-lg font-semibold text-text">
                {variant.label}
              </span>
              <span className="font-mono text-xs text-text-muted transition-colors duration-200 group-hover:text-accent">
                ▶ play
              </span>
            </span>
            <span className="font-body text-sm leading-relaxed text-text-muted">
              {variant.description}
            </span>
          </button>
        ))}
      </div>

      {ActiveVariantComponent && (
        <ActiveVariantComponent
          // Remount on each selection so re-picking the same variant replays it.
          key={activeVariantId}
          onComplete={() => setActiveVariantId(null)}
        />
      )}
    </section>
  );
}
