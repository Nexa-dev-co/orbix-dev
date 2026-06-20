'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const TEXTURE_PATH   = '/textures/sun/Gemini_Generated_Image_4t1f6s4t1f6s4t1f.png';
const SUN_RADIUS     = 0.76;
const CORONA_RADIUS  = 0.92;
const OUTER_RADIUS   = 1.12;
const CAMERA_FOV     = 35;
const CAMERA_Z       = 3;
const ROTATION_SPEED = 0.0018;

export default function SunCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    // Higher pixel ratio so the sphere stays sharp when GSAP scales the card up
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 2, 4));

    const initialWidth  = canvas.clientWidth  || canvas.offsetWidth  || 900;
    const initialHeight = canvas.clientHeight || canvas.offsetHeight || 300;
    renderer.setSize(initialWidth, initialHeight, false);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, initialWidth / initialHeight, 0.1, 100);
    camera.position.z = CAMERA_Z;

    // ── Sun sphere ─────────────────────────────────────────────────
    const loader     = new THREE.TextureLoader();
    const sunTexture = loader.load(TEXTURE_PATH);

    const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTexture });
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
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      sunMesh.rotation.y += ROTATION_SPEED;
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
