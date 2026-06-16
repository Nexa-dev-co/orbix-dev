"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uProgress; // 0.0 → 1.0
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Wave distortion that sweeps top to bottom
    float wave = sin(uv.x * 8.0 + uTime * 3.0) * 0.04;
    float sweep = smoothstep(
      uProgress - 0.3,
      uProgress + 0.3,
      uv.y + wave
    );

    // Black overlay with wave edge
    float alpha = sweep * (1.0 - uProgress) * 2.5;
    alpha = clamp(alpha, 0.0, 0.92);

    gl_FragColor = vec4(0.024, 0.024, 0.024, alpha);
  }
`;

// Sections whose entrance triggers a wave sweep.
const SECTION_IDS = ["studio", "work", "process", "contact"];

/**
 * Full-screen WebGL plane fixed over the page. A GLSL displacement wave sweeps
 * across and dissolves whenever a new section scrolls into view, directing the
 * transition like a film cut. Resting state is fully transparent (uProgress=1).
 * Disabled on mobile and reduced-motion; never fires on the initial load.
 */
export default function ShaderTransition() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Perf rule 5: no shader transition on mobile.
    if (prefersReduced || window.innerWidth < 768) return;

    // ── Scene / camera / fullscreen quad ──
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uProgress: { value: 1 }, // 1 = fully cleared / transparent at rest
        uTime: { value: 0 },
      },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // ── Gate: don't fire during the initial load / scroll restoration ──
    const hasLoaded = { current: false };
    const loadTimer = setTimeout(() => {
      hasLoaded.current = true;
    }, 2000);

    const playTransition = () => {
      if (!hasLoaded.current) return;
      gsap.fromTo(
        material.uniforms.uProgress,
        { value: 0 },
        { value: 1, duration: 1.2, ease: "power2.inOut", overwrite: true }
      );
    };

    // One trigger per section — wave plays arriving from either direction.
    const triggers = SECTION_IDS.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      return ScrollTrigger.create({
        trigger: el,
        start: "top 65%",
        onEnter: playTransition,
        onEnterBack: playTransition,
      });
    });

    // ── Resize ──
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── RAF: advance time, render ──
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      material.uniforms.uTime.value += 0.016;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(loadTimer);
      window.removeEventListener("resize", onResize);
      triggers.forEach((t) => t?.kill());
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 50,
        pointerEvents: "none",
      }}
    />
  );
}
