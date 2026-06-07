"use client";

import { useEffect, useRef } from "react";
import "./loading-variants.css";
import { gsap } from "@/lib/gsap-config";
import { createWordCanvas } from "./sample-text";
import type { LoadingVariantProps } from "../loading-variant";

const WORDMARK_TEXT = "NEXA";
const FORMATION_DURATION_SECONDS = 1.9;
const HOLD_SECONDS = 0.7;
const REVEAL_DURATION_SECONDS = 0.9;
const MAX_PIXEL_RATIO = 2;

/*
  Advanced shader reveal: the NEXA wordmark materializes out of signal glitch
  (band tearing, RGB split, scanlines), settles crisp, then glitch-wipes away to
  reveal the page. Mask canvas matches the viewport so vUv samples it 1:1.
*/
export default function GlitchLoading({ onComplete }: LoadingVariantProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      await document.fonts.ready;
      const THREE = await import("three");
      const { createThreeContext } = await import("@/lib/three-setup");
      const { glitchVertexShader, glitchFragmentShader } = await import(
        "./glitch-shader"
      );
      if (isCancelled) return;

      const { renderer, scene, camera, handleResize, dispose } =
        createThreeContext({ canvas, maxPixelRatio: MAX_PIXEL_RATIO });

      const maskCanvas = createWordCanvas({
        text: WORDMARK_TEXT,
        width: Math.round(window.innerWidth),
        height: Math.round(window.innerHeight),
        fontFraction: 0.26,
      });
      const maskTexture = new THREE.CanvasTexture(maskCanvas);
      maskTexture.minFilter = THREE.LinearFilter;

      const uniforms = {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uReveal: { value: 0 },
        uMask: { value: maskTexture },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      };
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        vertexShader: glitchVertexShader,
        fragmentShader: glitchFragmentShader,
        uniforms,
        transparent: true,
        depthTest: false,
      });
      scene.add(new THREE.Mesh(geometry, material));

      const handleWindowResize = () => {
        handleResize();
        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleWindowResize);

      const startTime = performance.now();
      renderer.setAnimationLoop(() => {
        uniforms.uTime.value = (performance.now() - startTime) / 1000;
        renderer.render(scene, camera);
      });

      requestAnimationFrame(() =>
        containerRef.current?.setAttribute("data-transparent", "")
      );

      cleanup = () => {
        renderer.setAnimationLoop(null);
        window.removeEventListener("resize", handleWindowResize);
        geometry.dispose();
        material.dispose();
        maskTexture.dispose();
        dispose();
      };

      const timeline = gsap.timeline({
        onComplete: () => {
          renderer.setAnimationLoop(null);
          if (!isCancelled) onComplete();
        },
      });
      timeline.to(uniforms.uProgress, {
        value: 1,
        duration: FORMATION_DURATION_SECONDS,
        ease: "power2.out",
      });
      timeline.to({}, { duration: HOLD_SECONDS });
      timeline.to(uniforms.uReveal, {
        value: 1,
        duration: REVEAL_DURATION_SECONDS,
        ease: "power1.in",
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
