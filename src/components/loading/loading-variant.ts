import type { ComponentType } from "react";

/*
  Contract every loading variant implements. A variant is a full-screen overlay
  that begins playing on mount, reveals whatever is behind it, then calls
  onComplete exactly once when its sequence finishes. Keeping the surface this
  small lets the loading lab (and, later, the real boot) swap variants freely.
*/
export interface LoadingVariantProps {
  onComplete: () => void;
}

export interface LoadingVariantDefinition {
  id: string;
  label: string;
  description: string;
  Component: ComponentType<LoadingVariantProps>;
}
