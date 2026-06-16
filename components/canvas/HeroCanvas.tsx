"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PARTICLE_VERT = /* glsl */ `
  attribute float size;
  uniform vec2 uMouse;   // normalized -0.5 → 0.5
  uniform float uTime;

  void main() {
    vec3 pos = position;

    // Distance from mouse in the 2D projection of the field.
    vec2 m = uMouse * 2.5;
    vec2 diff = pos.xy - m;
    float dist = length(diff);
    float influence = smoothstep(1.0, 0.0, dist);

    // Push particles away from the cursor with a rippling wobble.
    vec2 dir = dist > 0.0001 ? diff / dist : vec2(0.0);
    pos.xy += dir * influence * 0.08 * sin(uTime * 3.0 + dist * 5.0);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;            // round points
    float a = uOpacity * smoothstep(0.25, 0.0, d);
    gl_FragColor = vec4(uColor, a);
  }
`;

/**
 * Hero WebGL backdrop. A custom-shader particle field that the camera travels
 * forward through on scroll (z 3 → 0.8) while particles fade and a wireframe
 * sphere implodes. The cursor both parallaxes the camera and ripples nearby
 * particles via the vertex shader. Mobile uses fewer particles and no scroll
 * camera; reduced-motion skips the scene entirely.
 */
export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const isMobile = window.innerWidth < 768;
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    const parent = canvas.parentElement ?? document.body;
    let width = parent.clientWidth || window.innerWidth;
    let height = parent.clientHeight || window.innerHeight;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    // ── Scene + camera ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 3;

    // ── Particle field (custom shader) ──
    const COUNT = isMobile ? 600 : 1800; // perf rule 5
    const RADIUS = 2.5;
    const positions = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = RADIUS * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.04 + Math.random() * 0.04;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(0xff3d1f) },
        uOpacity: { value: 0.55 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
      },
    });
    const points = new THREE.Points(particleGeo, particleMat);
    scene.add(points);

    // ── Faint wireframe sphere ──
    const sphereGeo = new THREE.SphereGeometry(1.8, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xff3d1f,
      wireframe: true,
      transparent: true,
      opacity: 0.04,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // ── Mouse parallax (camera x/y via quickTo) + ripple uniform ──
    const camXTo = gsap.quickTo(camera.position, "x", {
      duration: 0.6,
      ease: "power3",
    });
    const camYTo = gsap.quickTo(camera.position, "y", {
      duration: 0.6,
      ease: "power3",
    });
    const onMouseMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = -(e.clientY / window.innerHeight - 0.5);
      camXTo(nx * 0.4);
      camYTo(ny * 0.4);
      particleMat.uniforms.uMouse.value.set(nx, ny);
    };
    if (finePointer) window.addEventListener("mousemove", onMouseMove);

    // ── Scroll-driven camera flight (desktop only) ──
    let scrollTl: gsap.core.Timeline | undefined;
    if (!isMobile) {
      scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: parent,
          start: "top top",
          end: "bottom top",
          scrub: 2,
        },
      });
      scrollTl.to(camera.position, { z: 0.8, ease: "none" }, 0);
      scrollTl.to(camera.rotation, { x: 0.15, ease: "none" }, 0);
      scrollTl.to(
        particleMat.uniforms.uOpacity,
        { value: 0, ease: "power2.in" },
        0.6
      );
      scrollTl.to(
        sphere.scale,
        { x: 0.3, y: 0.3, z: 0.3, ease: "power2.in" },
        0.4
      );
    }

    // ── Resize ──
    const onResize = () => {
      width = parent.clientWidth || window.innerWidth;
      height = parent.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    // ── Animation loop ──
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      particleMat.uniforms.uTime.value += 0.016;
      sphere.rotation.y -= 0.0004;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      scrollTl?.scrollTrigger?.kill();
      scrollTl?.kill();
      particleGeo.dispose();
      particleMat.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}
