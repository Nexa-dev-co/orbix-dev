"use client";

import { useEffect, useRef, useState } from "react";
import "./LoadingOverlay.css";
import { startGrainOverlay } from "./grain-overlay";
import { useIrisReveal } from "@/hooks/useIrisReveal";

// Phase timings (see CLAUDE.md loading spec). Each beat is deliberately spaced
// so the reveal feels like a sequence of discoveries, not a single splash.
const LOTTIE_FADE_IN_MS = 200;
const LOGO_FADE_IN_MS = 600;
const TAGLINE_FADE_IN_MS = 1200;
// Nexa runs longer than alche's 2500ms — the animation deserves full attention.
const MINIMUM_DISPLAY_MS = 2800;

const TAGLINE_TEXT = "We build digital products that perform.";
const LOTTIE_PATH = "/loading/data.json";

/*
  Full-screen loading overlay, rendered above everything in the root layout. It
  paints black from first paint (covering content gated behind
  body[data-loaded="true"]), runs the grain → Lottie → logo → tagline sequence,
  then hands off to the WebGL iris reveal once the page has loaded and the
  minimum display time has elapsed.
*/
export default function LoadingOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement>(null);
  const irisCanvasRef = useRef<HTMLCanvasElement>(null);

  const { runReveal } = useIrisReveal(irisCanvasRef);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const dismissOverlay = () => {
      // Page is now visible (iris fully open / skipped) — unlock gated content.
      document.body.setAttribute("data-loaded", "true");
      containerRef.current?.setAttribute("data-hidden", "");
      setIsDismissed(true);
    };

    // Fast paths: reduced-motion users and the ?skip_loading bypass skip the
    // whole sequence (Animation Philosophy: bypass via query param, not code).
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const skipLoading = new URLSearchParams(window.location.search).has(
      "skip_loading"
    );
    if (prefersReducedMotion || skipLoading) {
      dismissOverlay();
      return;
    }

    // Grain is visible immediately; everything else fades in on a timer.
    const grain = grainCanvasRef.current
      ? startGrainOverlay(grainCanvasRef.current)
      : null;

    let lottieAnimation: { destroy: () => void } | null = null;
    void (async () => {
      const lottie = (await import("lottie-web")).default;
      if (isCancelled || !lottieRef.current) {
        return;
      }
      lottieAnimation = lottie.loadAnimation({
        container: lottieRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: LOTTIE_PATH,
      });
    })();

    const fadeIn = (element: HTMLElement | null) => {
      if (element) {
        element.style.opacity = "1";
      }
    };
    const phaseTimers = [
      window.setTimeout(() => fadeIn(lottieRef.current), LOTTIE_FADE_IN_MS),
      window.setTimeout(() => fadeIn(logoRef.current), LOGO_FADE_IN_MS),
      window.setTimeout(() => fadeIn(taglineRef.current), TAGLINE_FADE_IN_MS),
    ];

    // The iris fires only after real assets have loaded AND the minimum display
    // time is met — avoids a jarring flash on fast machines.
    const waitForPageLoad = new Promise<void>((resolve) => {
      if (document.readyState === "complete") {
        resolve();
        return;
      }
      window.addEventListener("load", () => resolve(), { once: true });
    });
    const waitForMinimumDisplay = new Promise<void>((resolve) =>
      window.setTimeout(resolve, MINIMUM_DISPLAY_MS)
    );

    // Once the black iris frame is on screen, drop the backdrop + loading
    // content so the iris opens directly onto the real page, not onto them.
    const handleCovered = () => {
      containerRef.current?.setAttribute("data-revealing", "");
      grain?.stop();
      [lottieRef, logoRef, taglineRef].forEach((elementRef) => {
        if (elementRef.current) {
          elementRef.current.style.opacity = "0";
        }
      });
      if (grainCanvasRef.current) {
        grainCanvasRef.current.style.opacity = "0";
      }
    };

    void Promise.all([waitForPageLoad, waitForMinimumDisplay]).then(() => {
      if (isCancelled) {
        return;
      }
      void runReveal(handleCovered).then(dismissOverlay);
    });

    return () => {
      isCancelled = true;
      phaseTimers.forEach((timerId) => window.clearTimeout(timerId));
      grain?.stop();
      lottieAnimation?.destroy();
    };
  }, [runReveal]);

  if (isDismissed) {
    return null;
  }

  return (
    <div ref={containerRef} className="loading-container">
      <canvas ref={grainCanvasRef} className="loading-grain" />

      <div className="loading-lottie-container">
        <div ref={lottieRef} className="loading-lottie" />
      </div>

      <div ref={logoRef} className="loading-logo">
        {/* Placeholder geometric "N" — swap the path data for a designed mark.
            Stroke color/fill come from LoadingOverlay.css. */}
        <svg
          viewBox="0 0 100 120"
          style={{ width: "12vmax", height: "auto" }}
          aria-hidden="true"
        >
          <path
            d="M20 100 L20 20 L80 100 L80 20"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p ref={taglineRef} className="loading-text">
        {TAGLINE_TEXT}
      </p>

      <canvas ref={irisCanvasRef} className="loading-iris-canvas" />
    </div>
  );
}
