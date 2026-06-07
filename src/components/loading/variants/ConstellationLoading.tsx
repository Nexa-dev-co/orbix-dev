"use client";

import { useEffect, useRef } from "react";
import "./loading-variants.css";
import { gsap } from "@/lib/gsap-config";
import { sampleWordPoints } from "./sample-text";
import type { LoadingVariantProps } from "../loading-variant";

const WORDMARK_TEXT = "NEXA";
const APPROX_POINT_COUNT = 1150;
// World size the wordmark spans (height ≈ WORD_WORLD_SIZE units).
const WORD_WORLD_SIZE = 42;
const CAMERA_FOV = 45;
const CAMERA_START_Z = 16; // zoomed in — points scattered past the frame edges
const CAMERA_END_Z = 66; // pulled back — the whole word reads
// Connect each node to up to this many near neighbors, within the radius.
const MAX_NEIGHBORS_PER_NODE = 2;
const NEIGHBOR_RADIUS = WORD_WORLD_SIZE * 0.07;

const ACCENT_RGB: [number, number, number] = [0.0, 0.898, 1.0];

const pointVertexShader = /* glsl */ `
  uniform float uPointSize;
  void main() {
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    // Perspective size attenuation — nearer points read larger.
    gl_PointSize = uPointSize * (300.0 / -modelViewPosition.z);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const pointFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float softCircle = smoothstep(0.5, 0.0, distanceToCenter);
    gl_FragColor = vec4(uColor, softCircle * uOpacity);
  }
`;

/*
  Builds line segments connecting each target node to its nearest neighbors,
  returning index pairs. O(n²) but runs once at setup for ~720 nodes.
*/
function buildNeighborPairs(targets: Float32Array, count: number): number[] {
  const pairs: number[] = [];
  const radiusSquared = NEIGHBOR_RADIUS * NEIGHBOR_RADIUS;
  for (let i = 0; i < count; i += 1) {
    const xi = targets[i * 3];
    const yi = targets[i * 3 + 1];
    const nearest: { index: number; distanceSquared: number }[] = [];
    for (let j = i + 1; j < count; j += 1) {
      const dx = xi - targets[j * 3];
      const dy = yi - targets[j * 3 + 1];
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < radiusSquared) {
        nearest.push({ index: j, distanceSquared });
      }
    }
    nearest.sort((a, b) => a.distanceSquared - b.distanceSquared);
    for (
      let k = 0;
      k < Math.min(MAX_NEIGHBORS_PER_NODE, nearest.length);
      k += 1
    ) {
      pairs.push(i, nearest[k].index);
    }
  }
  return pairs;
}

/*
  Advanced wordmark reveal. A scattered 3D node field converges into "NEXA" as
  the camera pulls back; neighbor lines fade in to form a constellation; then
  the nodes burst outward and the overlay dissolves to reveal the page.
*/
export default function ConstellationLoading({
  onComplete,
}: LoadingVariantProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Glyphs must be loaded before sampling, or we'd get fallback shapes.
      await document.fonts.ready;
      const THREE = await import("three");
      const { createThreeContext } = await import("@/lib/three-setup");
      if (isCancelled) return;

      const { renderer, scene, camera, handleResize, dispose } =
        createThreeContext({ canvas, fieldOfView: CAMERA_FOV });
      camera.position.z = CAMERA_START_Z;

      const sampled = sampleWordPoints({
        text: WORDMARK_TEXT,
        approximateCount: APPROX_POINT_COUNT,
      });
      const pointCount = sampled.count;

      // Per-node arrays: where it starts (scattered), where it lands (the word),
      // and where it flees during the outro burst.
      const targetPositions = new Float32Array(pointCount * 3);
      const scatterPositions = new Float32Array(pointCount * 3);
      const burstPositions = new Float32Array(pointCount * 3);
      for (let i = 0; i < pointCount; i += 1) {
        const targetX = sampled.positions[i * 2] * WORD_WORLD_SIZE;
        const targetY = sampled.positions[i * 2 + 1] * WORD_WORLD_SIZE;
        const targetZ = (Math.random() - 0.5) * 3;
        targetPositions[i * 3] = targetX;
        targetPositions[i * 3 + 1] = targetY;
        targetPositions[i * 3 + 2] = targetZ;

        scatterPositions[i * 3] = (Math.random() - 0.5) * 160;
        scatterPositions[i * 3 + 1] = (Math.random() - 0.5) * 110;
        scatterPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;

        // Burst radially outward from the word's center, with a forward bias.
        const outwardLength = Math.hypot(targetX, targetY) || 1;
        burstPositions[i * 3] =
          targetX + (targetX / outwardLength) * 60 + (Math.random() - 0.5) * 30;
        burstPositions[i * 3 + 1] =
          targetY + (targetY / outwardLength) * 60 + (Math.random() - 0.5) * 30;
        burstPositions[i * 3 + 2] = targetZ + 40 + Math.random() * 30;
      }

      // Live position buffer the GPU reads; rewritten every frame.
      const livePositions = new Float32Array(pointCount * 3);
      livePositions.set(scatterPositions);

      const pointGeometry = new THREE.BufferGeometry();
      pointGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(livePositions, 3),
      );
      const pointMaterial = new THREE.ShaderMaterial({
        vertexShader: pointVertexShader,
        fragmentShader: pointFragmentShader,
        uniforms: {
          uPointSize: { value: 1.7 },
          uColor: { value: new THREE.Vector3(...ACCENT_RGB) },
          uOpacity: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(pointGeometry, pointMaterial);
      scene.add(points);

      // Constellation lines — two endpoints per segment, refreshed each frame
      // from the live node positions so they track the convergence.
      const neighborPairs = buildNeighborPairs(targetPositions, pointCount);
      const segmentCount = neighborPairs.length / 2;
      const linePositions = new Float32Array(segmentCount * 2 * 3);
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions, 3),
      );
      const lineMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(...ACCENT_RGB),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lines);

      // Animated state, driven by the GSAP timeline below.
      const animationState = { formation: 0, outro: 0 };

      const handleWindowResize = () => handleResize();
      window.addEventListener("resize", handleWindowResize);

      renderer.setAnimationLoop(() => {
        const formationEased = animationState.formation;
        const outro = animationState.outro;
        for (let i = 0; i < pointCount; i += 1) {
          const offset = i * 3;
          for (let axis = 0; axis < 3; axis += 1) {
            const formed =
              scatterPositions[offset + axis] +
              (targetPositions[offset + axis] -
                scatterPositions[offset + axis]) *
                formationEased;
            // During the outro, ease from the formed word toward the burst.
            livePositions[offset + axis] =
              formed + (burstPositions[offset + axis] - formed) * outro;
          }
        }
        pointGeometry.attributes.position.needsUpdate = true;

        for (let segment = 0; segment < segmentCount; segment += 1) {
          const startNode = neighborPairs[segment * 2] * 3;
          const endNode = neighborPairs[segment * 2 + 1] * 3;
          const lineOffset = segment * 6;
          linePositions[lineOffset] = livePositions[startNode];
          linePositions[lineOffset + 1] = livePositions[startNode + 1];
          linePositions[lineOffset + 2] = livePositions[startNode + 2];
          linePositions[lineOffset + 3] = livePositions[endNode];
          linePositions[lineOffset + 4] = livePositions[endNode + 1];
          linePositions[lineOffset + 5] = livePositions[endNode + 2];
        }
        lineGeometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
      });

      cleanup = () => {
        renderer.setAnimationLoop(null);
        window.removeEventListener("resize", handleWindowResize);
        pointGeometry.dispose();
        pointMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
        dispose();
      };

      // 1. Converge into the word while the camera pulls back, then fade the
      //    lines in. 2. Hold. 3. Burst outward + fade as the page is revealed.
      const timeline = gsap.timeline({
        onComplete: () => {
          renderer.setAnimationLoop(null);
          if (!isCancelled) onComplete();
        },
      });
      timeline.to(animationState, {
        formation: 1,
        duration: 2.2,
        ease: "power2.inOut",
      });
      timeline.to(
        camera.position,
        { z: CAMERA_END_Z, duration: 2.4, ease: "power2.inOut" },
        0,
      );
      timeline.to(
        lineMaterial,
        { opacity: 0.55, duration: 1.1, ease: "power2.out" },
        1.1,
      );
      timeline.to({}, { duration: 1.2 }); // hold so the formed NEXA clearly reads
      timeline.add(() =>
        containerRef.current?.setAttribute("data-transparent", ""),
      );
      timeline.to(animationState, {
        outro: 1,
        duration: 0.9,
        ease: "power2.in",
      });
      timeline.to(
        pointMaterial.uniforms.uOpacity,
        { value: 0, duration: 0.8, ease: "power2.in" },
        "<",
      );
      timeline.to(
        lineMaterial,
        { opacity: 0, duration: 0.8, ease: "power2.in" },
        "<",
      );
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
