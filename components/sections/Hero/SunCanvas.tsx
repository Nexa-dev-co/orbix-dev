'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SUN_VERTEX_SHADER, SUN_FRAGMENT_SHADER } from './sunShaders';

const SUN_RADIUS     = 0.76;
const CORONA_RADIUS  = 0.92;
const OUTER_RADIUS   = 1.12;
const CAMERA_FOV     = 35;
const CAMERA_Z       = 3;
const ROTATION_SPEED = 0.0018;

// Procedural plasma-star surface (see sunShaders.ts). A hot star is genuinely
// photorealistic in this blue/cyan range, so this stays on-brand while reading
// as a real, churning star. Swap these three for warm tones (e.g. core 0xfff2c8 /
// mid 0xff8a2b / deep 0x6e1f02) to make it a classic orange sun instead.
const SUN_COLOR_CORE = 0xd8f6ff; // white-hot brightest granules
const SUN_COLOR_MID  = 0x00d9ff; // electric-cyan plasma body (brand accent)
const SUN_COLOR_DEEP = 0x012b52; // deep-blue convection troughs
const NOISE_SCALE      = 2.4;
const FLOW_SPEED       = 0.5;
const SURFACE_CONTRAST = 1.35;

export default function SunCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    // The surface is procedural, so it stays sharp at any scale without texture
    // supersampling — a plain DPR clamp keeps the fragment shader affordable when
    // the scroll expansion blows the sun up to fill the hero.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const initialWidth  = canvas.clientWidth  || canvas.offsetWidth  || 900;
    const initialHeight = canvas.clientHeight || canvas.offsetHeight || 300;
    renderer.setSize(initialWidth, initialHeight, false);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, initialWidth / initialHeight, 0.1, 100);
    camera.position.z = CAMERA_Z;

    // ── Sun sphere — procedural plasma surface ─────────────────────
    const sunUniforms = {
      uTime:       { value: 0 },
      uColorCore:  { value: new THREE.Color(SUN_COLOR_CORE) },
      uColorMid:   { value: new THREE.Color(SUN_COLOR_MID) },
      uColorDeep:  { value: new THREE.Color(SUN_COLOR_DEEP) },
      uNoiseScale: { value: NOISE_SCALE },
      uFlowSpeed:  { value: FLOW_SPEED },
      uContrast:   { value: SURFACE_CONTRAST },
    };

    const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, 64, 64);
    const sunMat = new THREE.ShaderMaterial({
      vertexShader:   SUN_VERTEX_SHADER,
      fragmentShader: SUN_FRAGMENT_SHADER,
      uniforms:       sunUniforms,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    // ── Inner corona — tight additive glow ─────────────────────────
    const coronaGeo = new THREE.SphereGeometry(CORONA_RADIUS, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0x0af0ff,
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(coronaGeo, coronaMat));

    // ── Outer halo — wide soft glow ────────────────────────────────
    const outerGeo = new THREE.SphereGeometry(OUTER_RADIUS, 32, 32);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x004488,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(outerGeo, outerMat));

    // ── Render loop ────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      sunMesh.rotation.y += ROTATION_SPEED;
      sunUniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ────────────────────────────────────────────────────
    const handleResize = () => {
      const canvasWidth  = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;
      if (canvasWidth === 0 || canvasHeight === 0) return;
      camera.aspect = canvasWidth / canvasHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvasWidth, canvasHeight, false);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas.parentElement ?? canvas);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      renderer.dispose();
      sunGeo.dispose();    sunMat.dispose();
      coronaGeo.dispose(); coronaMat.dispose();
      outerGeo.dispose();  outerMat.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="sun-canvas" />;
}
