"use client";

import { useEffect, useRef } from "react";
import "./loading-variants.css";
import { gsap } from "@/lib/gsap-config";
import { createWordCanvas } from "./sample-text";
import type { LoadingVariantProps } from "../loading-variant";

const WORDMARK_TEXT = "NEXA";
const WRITE_DURATION_SECONDS = 1.3;
const WORD_HOLD_SECONDS = 0.6;
const DISSOLVE_DURATION_SECONDS = 1.8;

/*
  WebGL noise dissolve with a wordmark intro. A pen writes NEXA left→right on the
  black overlay; after a beat the black erodes along a moving noise edge to
  reveal the page (the letters erode with it). Three.js is imported dynamically
  so it never touches SSR.
*/
export default function DissolveLoading({ onComplete }: LoadingVariantProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Glyphs must be loaded before sampling the wordmark mask.
      await document.fonts.ready;
      const THREE = await import("three");
      const { createThreeContext } = await import("@/lib/three-setup");
      const { dissolveVertexShader, dissolveFragmentShader } = await import(
        "./dissolve-shader"
      );
      if (isCancelled) return;

      const { renderer, scene, camera, handleResize, dispose } =
        createThreeContext({ canvas });

      // Viewport-sized mask so the shader samples NEXA 1:1 with vUv.
      const maskCanvas = createWordCanvas({
        text: WORDMARK_TEXT,
        width: Math.round(window.innerWidth),
        height: Math.round(window.innerHeight),
        fontFraction: 0.28,
      });
      const maskTexture = new THREE.CanvasTexture(maskCanvas);
      maskTexture.minFilter = THREE.LinearFilter;

      const uniforms = {
        uProgress: { value: 0 },
        uAccentPulse: { value: 1 },
        uWrite: { value: 0 },
        uMask: { value: maskTexture },
      };
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        vertexShader: dissolveVertexShader,
        fragmentShader: dissolveFragmentShader,
        uniforms,
        transparent: true,
        depthTest: false,
      });
      scene.add(new THREE.Mesh(geometry, material));

      const handleWindowResize = () => handleResize();
      window.addEventListener("resize", handleWindowResize);
      renderer.setAnimationLoop(() => renderer.render(scene, camera));

      cleanup = () => {
        renderer.setAnimationLoop(null);
        window.removeEventListener("resize", handleWindowResize);
        geometry.dispose();
        material.dispose();
        maskTexture.dispose();
        dispose();
      };

      // The overlay covers black from the first frame, so dropping the backdrop
      // now is safe (the dissolve reveals the page later, not the container).
      requestAnimationFrame(() =>
        containerRef.current?.setAttribute("data-transparent", "")
      );

      // 1. Pen writes NEXA. 2. Hold. 3. Noise erodes everything to reveal page.
      const timeline = gsap.timeline({
        onComplete: () => {
          renderer.setAnimationLoop(null);
          if (!isCancelled) onComplete();
        },
      });
      timeline.to(uniforms.uWrite, {
        value: 1,
        duration: WRITE_DURATION_SECONDS,
        ease: "power1.inOut",
      });
      timeline.to({}, { duration: WORD_HOLD_SECONDS });
      timeline.to(uniforms.uProgress, {
        value: 1,
        duration: DISSOLVE_DURATION_SECONDS,
        ease: "power1.inOut",
      });
    })();

    return () => {
      isCancelled = true;
      cleanup?.();
    };
  }, [onComplete]);

  return (
    <div ref={containerRef} className="lv-container">
      <canvas ref={canvasRef} className="lv-fullscreen-canvas" />
    </div>
  );
}
