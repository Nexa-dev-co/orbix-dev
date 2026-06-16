"use client";

import { useEffect, useState } from "react";
import {
  LOADERS,
  LOADER_ORDER,
  DEFAULT_LOADER,
  type LoaderKey,
} from "@/components/loaders";

/**
 * Orchestrates the intro loading screen. Shown on every load of the home page
 * for now (no persistence). Which loader plays is decided by an optional
 * `?loader=` URL param so the variants can be compared without code changes:
 *
 *   ?loader=orbital | kinetic | counter | words | curtain | stroke | scramble
 *   ?loader=1..7     (by position in LOADER_ORDER)
 *   ?loader=random   (pick one at random each load)
 *
 * With no param it falls back to DEFAULT_LOADER.
 *
 * Render phases:
 *   cover  — opaque panel painted on first frame / during SSR (no content flash)
 *   active — the chosen loader plays its intro and reveals the site
 *   done   — unmounted
 */
export default function PageLoader() {
  const [phase, setPhase] = useState<"cover" | "active" | "done">("cover");
  const [key, setKey] = useState<LoaderKey>(DEFAULT_LOADER);

  useEffect(() => {
    setKey(resolveLoader());
    setPhase("active");
  }, []);

  if (phase === "done") return null;

  if (phase === "cover") {
    return (
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--bg)",
          zIndex: 10000,
        }}
      />
    );
  }

  const Active = LOADERS[key];
  return <Active onComplete={() => setPhase("done")} />;
}

function resolveLoader(): LoaderKey {
  const raw = new URLSearchParams(window.location.search).get("loader");
  if (!raw) return DEFAULT_LOADER;

  if (raw === "random") {
    return LOADER_ORDER[Math.floor(Math.random() * LOADER_ORDER.length)];
  }
  if ((LOADER_ORDER as string[]).includes(raw)) {
    return raw as LoaderKey;
  }
  const n = Number.parseInt(raw, 10);
  if (n >= 1 && n <= LOADER_ORDER.length) {
    return LOADER_ORDER[n - 1];
  }
  return DEFAULT_LOADER;
}
