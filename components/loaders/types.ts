/**
 * Shared contract for every loading screen. A loader covers the viewport on
 * load, plays its intro, reveals the site, and then calls `onComplete` so the
 * orchestrator can unmount it. Loaders are responsible for honouring
 * `prefers-reduced-motion` (resolve quickly / skip animation).
 */
export interface LoaderProps {
  onComplete: () => void;
}
