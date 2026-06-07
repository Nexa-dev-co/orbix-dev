"use client";

import { useEffect, useRef } from "react";
import "./loading-variants.css";
import { gsap } from "@/lib/gsap-config";
import { createWordCanvas } from "./sample-text";
import type { LoadingVariantProps } from "../loading-variant";

const WORDMARK_TEXT = "NEXA";
const RING_COUNT = 48;
const RING_SPACING = 6.2;
const RING_RADIUS = 16;
const RING_SEGMENTS = 64;
const CAMERA_FOV = 72;
const CAMERA_FAR = 420;
const CAMERA_START_Z = 26;
// Stop just short of the wordmark plane at the far end of the tunnel.
const WORD_PLANE_Z = -(RING_COUNT * RING_SPACING) - 8;
const CAMERA_END_Z = WORD_PLANE_Z + 12;
const WORD_PLANE_HEIGHT = 14;

const ACCENT_HEX = 0x00e5ff;

/*
  Advanced 3D reveal: the camera flies down a tunnel of glowing cyan rings and
  decelerates as the NEXA wordmark resolves at the far end, then punches through
  it (the letters scale up and fade) to reveal the page.
*/
export default function WarpTunnelLoading({ onComplete }: LoadingVariantProps) {
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
      if (isCancelled) return;

      const { renderer, scene, camera, handleResize, dispose } =
        createThreeContext({
          canvas,
          fieldOfView: CAMERA_FOV,
          farPlane: CAMERA_FAR,
        });
      camera.position.z = CAMERA_START_Z;

      // One ring geometry, reused by every ring line down the tunnel.
      const ringPositions: number[] = [];
      for (let segment = 0; segment <= RING_SEGMENTS; segment += 1) {
        const angle = (segment / RING_SEGMENTS) * Math.PI * 2;
        ringPositions.push(
          Math.cos(angle) * RING_RADIUS,
          Math.sin(angle) * RING_RADIUS,
          0
        );
      }
      const ringGeometry = new THREE.BufferGeometry();
      ringGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(ringPositions, 3)
      );
      const ringMaterial = new THREE.LineBasicMaterial({
        color: ACCENT_HEX,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const tunnel = new THREE.Group();
      for (let ringIndex = 0; ringIndex < RING_COUNT; ringIndex += 1) {
        const ring = new THREE.LineLoop(ringGeometry, ringMaterial);
        ring.position.z = -ringIndex * RING_SPACING;
        // Slight per-ring twist so the tunnel reads as a corridor, not a stack.
        ring.rotation.z = ringIndex * 0.08;
        tunnel.add(ring);
      }
      scene.add(tunnel);

      // Wordmark plane at the tunnel's end. Additive cyan: black mask pixels add
      // nothing (invisible), white pixels glow as the letters.
      const maskCanvas = createWordCanvas({
        text: WORDMARK_TEXT,
        width: Math.round(window.innerWidth),
        height: Math.round(window.innerHeight),
        fontFraction: 0.3,
      });
      const maskTexture = new THREE.CanvasTexture(maskCanvas);
      maskTexture.minFilter = THREE.LinearFilter;
      const wordAspect = window.innerWidth / window.innerHeight;
      const wordGeometry = new THREE.PlaneGeometry(
        WORD_PLANE_HEIGHT * wordAspect,
        WORD_PLANE_HEIGHT
      );
      const wordMaterial = new THREE.MeshBasicMaterial({
        map: maskTexture,
        color: ACCENT_HEX,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const wordPlane = new THREE.Mesh(wordGeometry, wordMaterial);
      wordPlane.position.z = WORD_PLANE_Z;
      scene.add(wordPlane);

      const handleWindowResize = () => handleResize();
      window.addEventListener("resize", handleWindowResize);

      renderer.setAnimationLoop(() => {
        // Gentle swirl gives the flight some life.
        tunnel.rotation.z += 0.0015;
        renderer.render(scene, camera);
      });

      cleanup = () => {
        renderer.setAnimationLoop(null);
        window.removeEventListener("resize", handleWindowResize);
        ringGeometry.dispose();
        ringMaterial.dispose();
        wordGeometry.dispose();
        wordMaterial.dispose();
        maskTexture.dispose();
        dispose();
      };

      const timeline = gsap.timeline({
        onComplete: () => {
          renderer.setAnimationLoop(null);
          if (!isCancelled) onComplete();
        },
      });
      // Fly in: rings glow up, camera decelerates toward the word, word fades in.
      timeline.to(ringMaterial, { opacity: 0.5, duration: 0.6, ease: "power1.out" }, 0);
      timeline.to(
        camera.position,
        { z: CAMERA_END_Z, duration: 2.8, ease: "power2.out" },
        0
      );
      timeline.to(wordMaterial, { opacity: 1, duration: 1.1, ease: "power1.out" }, 1.3);
      timeline.to({}, { duration: 0.5 }); // hold on the resolved wordmark
      timeline.add(() =>
        containerRef.current?.setAttribute("data-transparent", "")
      );
      // Punch through: the letters scale up and everything fades to the page.
      timeline.to(wordPlane.scale, { x: 5, y: 5, duration: 0.9, ease: "power2.in" }, ">");
      timeline.to(wordMaterial, { opacity: 0, duration: 0.9, ease: "power2.in" }, "<");
      timeline.to(ringMaterial, { opacity: 0, duration: 0.6, ease: "power2.in" }, "<");
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
