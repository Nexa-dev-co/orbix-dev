"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTextScramble } from "@/hooks/useTextScramble";

const PARTICLE_COUNT = 900;
const FIELD_SPREAD = 90; // half-width of the cube the particles fill

const particleVertexShader = /* glsl */ `
  uniform float uPointSize;
  void main() {
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uPointSize * (260.0 / -modelViewPosition.z);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const particleFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float softCircle = smoothstep(0.5, 0.0, distanceToCenter);
    gl_FragColor = vec4(uColor, softCircle * 0.7);
  }
`;

const PRIMARY_CTA_CLASSES =
  "inline-flex items-center justify-center rounded-full bg-accent px-6 h-12 font-body text-sm font-medium text-bg transition-colors duration-200 hover:bg-accent-dim";
const OUTLINE_CTA_CLASSES =
  "inline-flex items-center justify-center rounded-full border border-border px-6 h-12 font-body text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent";

/*
  Full-viewport hero: a drifting Three.js particle field behind a scramble-in
  headline. The canvas sits behind content and never receives pointer events, so
  it can't block scroll or clicks (per Animation Philosophy).
*/
export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headlineRef = useTextScramble<HTMLHeadingElement>({
    startDelayMs: 400,
    durationMs: 1100,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      return;
    }

    let isCancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const THREE = await import("three");
      const { createThreeContext } = await import("@/lib/three-setup");
      if (isCancelled) return;

      const { renderer, scene, camera, handleResize, dispose } =
        createThreeContext({ canvas, fieldOfView: 60 });
      camera.position.z = 60;

      const positions = new Float32Array(PARTICLE_COUNT * 3);
      for (let particleIndex = 0; particleIndex < PARTICLE_COUNT; particleIndex += 1) {
        positions[particleIndex * 3] = (Math.random() - 0.5) * FIELD_SPREAD * 2;
        positions[particleIndex * 3 + 1] = (Math.random() - 0.5) * FIELD_SPREAD * 2;
        positions[particleIndex * 3 + 2] = (Math.random() - 0.5) * FIELD_SPREAD;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        uniforms: {
          uPointSize: { value: 2 },
          uColor: { value: new THREE.Vector3(0.0, 0.898, 1.0) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // Subtle pointer parallax — the field leans toward the cursor.
      const pointerTarget = { x: 0, y: 0 };
      const handlePointerMove = (event: PointerEvent) => {
        pointerTarget.x = (event.clientX / window.innerWidth - 0.5) * 2;
        pointerTarget.y = (event.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener("pointermove", handlePointerMove);
      const handleWindowResize = () => handleResize();
      window.addEventListener("resize", handleWindowResize);

      renderer.setAnimationLoop(() => {
        particles.rotation.y += 0.0004;
        particles.rotation.x += 0.0002;
        // Ease the whole field toward the pointer for a gentle parallax.
        particles.position.x += (pointerTarget.x * 4 - particles.position.x) * 0.03;
        particles.position.y += (-pointerTarget.y * 4 - particles.position.y) * 0.03;
        renderer.render(scene, camera);
      });

      cleanup = () => {
        renderer.setAnimationLoop(null);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("resize", handleWindowResize);
        geometry.dispose();
        material.dispose();
        dispose();
      };
    })();

    return () => {
      isCancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
        aria-hidden="true"
      />

      <span
        data-reveal-on-load
        className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-accent"
      >
        Digital product studio
      </span>
      <h1
        ref={headlineRef}
        data-reveal-on-load
        className="max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight text-text md:text-7xl"
      >
        We build digital products that perform.
      </h1>
      <p
        data-reveal-on-load
        className="mt-6 max-w-xl font-body text-base text-text-muted md:text-lg"
      >
        Nexa is a studio crafting fast, cinematic web experiences — from strategy
        and design through engineering and motion.
      </p>
      <div data-reveal-on-load className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link href="/contact" className={PRIMARY_CTA_CLASSES}>
          Start a project
        </Link>
        <Link href="/services" className={OUTLINE_CTA_CLASSES}>
          View services
        </Link>
      </div>
    </section>
  );
}
