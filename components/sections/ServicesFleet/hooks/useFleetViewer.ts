import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';

// ── Framing ─────────────────────────────────────────────────────────────
const CAMERA_FOV       = 32;
const CAMERA_DISTANCE  = 6.2;
const CAMERA_HEIGHT    = 0.5;
const TARGET_SIZE      = 2.6; // every model is normalised so its largest dimension lands here
// On desktop the vessel is pushed right so the index column on the left reads clean.
const DESKTOP_OFFSET_X = 0.95;
const DESKTOP_MIN_ASPECT = 1; // below this (portrait) the vessel re-centres for the stacked layout

// ── Idle motion ─────────────────────────────────────────────────────────
const AUTO_ROTATE_SPEED = 0.0024;
const FLOAT_AMPLITUDE   = 0.09;
const FLOAT_SPEED       = 0.85;
const PARALLAX_STRENGTH = 0.28;
const PARALLAX_EASE     = 0.055;

// ── Starfield ───────────────────────────────────────────────────────────
const STAR_COUNT      = 700;
const STAR_FIELD_SIZE = 26;
const STAR_DRIFT_SPEED = 0.008;

// ── Swap choreography ───────────────────────────────────────────────────
const EXIT_DURATION     = 0.45;
const ENTRANCE_DURATION = 1.05;
const ENTRANCE_SPIN     = Math.PI * 0.6; // models swing in with a quick extra turn
const ENTRANCE_SCALE_FROM = 0.72;

export interface FleetViewerStatus {
  isLoading: boolean;
  /** 0–100 when the server reports a size, otherwise -1 (indeterminate). */
  percent: number;
}

interface FleetViewerOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  modelPath: string;
  /** Bumped on every selection so re-picking the same vessel still replays the entrance. */
  selectionToken: number;
  onStatus: (status: FleetViewerStatus) => void;
}

/** Prepared, normalised model plus the materials we fade during swaps. */
interface PreparedVessel {
  group: THREE.Group;
  materials: THREE.Material[];
}

// Loaded vessels are cached by path so flipping between services is instant after
// the first visit — and so the same shared placeholder only ever loads once.
const vesselCache = new Map<string, PreparedVessel>();

function collectMaterials(root: THREE.Object3D): THREE.Material[] {
  const materials: THREE.Material[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of meshMaterials) {
        // Fading needs transparency; remember the design opacity so we fade back to it.
        material.transparent = true;
        material.userData.baseOpacity = material.opacity;
        materials.push(material);
      }
    }
  });
  return materials;
}

// Centre the model on the origin and scale it so every vessel reads at the same size,
// regardless of how the artist exported it.
function prepareVessel(loadedScene: THREE.Group): PreparedVessel {
  const boundingBox = new THREE.Box3().setFromObject(loadedScene);
  const size   = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());
  loadedScene.position.sub(center);

  const largestDimension = Math.max(size.x, size.y, size.z) || 1;
  const normalisedScale  = TARGET_SIZE / largestDimension;

  const group = new THREE.Group();
  group.scale.setScalar(normalisedScale);
  group.add(loadedScene);

  return { group, materials: collectMaterials(group) };
}

function setVesselOpacity(materials: THREE.Material[], factor: number) {
  for (const material of materials) {
    const baseOpacity = (material.userData.baseOpacity as number | undefined) ?? 1;
    material.opacity = baseOpacity * factor;
  }
}

function buildStarfield(): THREE.Points {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let starIndex = 0; starIndex < STAR_COUNT; starIndex += 1) {
    positions[starIndex * 3 + 0] = (Math.random() - 0.5) * STAR_FIELD_SIZE;
    positions[starIndex * 3 + 1] = (Math.random() - 0.5) * STAR_FIELD_SIZE;
    positions[starIndex * 3 + 2] = (Math.random() - 0.5) * STAR_FIELD_SIZE - 4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x9fb4c4,
    size: 0.018,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

export function useFleetViewer({ canvasRef, modelPath, selectionToken, onStatus }: FleetViewerOptions) {
  // The swap routine is rebuilt with the latest props each render but called from the
  // persistent setup effect, so we reach it through a ref.
  const swapToRef = useRef<(path: string) => void>(() => {});

  // ── 1. Persistent scene: created once, lives for the page's lifetime ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = prefersReducedMotion();

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);

    // Image-based lighting gives the metal real reflections without shipping an HDR.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;

    // Key + cool fill + an accent rim that traces the vessel's edge in Orbix cyan.
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 6, 5);
    const fillLight = new THREE.DirectionalLight(0x6f8cff, 0.6);
    fillLight.position.set(-6, -1, 2);
    const rimLight = new THREE.DirectionalLight(0x00e5ff, 1.6);
    rimLight.position.set(-3, 2, -6);
    scene.add(keyLight, fillLight, rimLight, new THREE.AmbientLight(0xffffff, 0.25));

    // placement → pivot (parallax + float) → spin (auto-rotate) → active vessel
    const placement = new THREE.Group();
    const pivot     = new THREE.Group();
    const spin      = new THREE.Group();
    placement.add(pivot);
    pivot.add(spin);
    scene.add(placement);

    const starfield = buildStarfield();
    scene.add(starfield);

    const loader = new GLTFLoader();

    let activeVessel: PreparedVessel | null = null;
    let currentPath  = '';
    let swapToken    = 0; // guards against a slow load resolving after a newer pick

    const swapTo = (path: string) => {
      const replayOnly = path === currentPath && activeVessel !== null;
      const thisToken  = (swapToken += 1);

      const mountVessel = (vessel: PreparedVessel) => {
        if (thisToken !== swapToken) return; // a newer selection won the race
        currentPath  = path;
        activeVessel = vessel;
        if (vessel.group.parent !== spin) spin.add(vessel.group);
        onStatus({ isLoading: false, percent: 100 });

        const baseScale = vessel.group.userData.baseScale as number;

        if (reduceMotion) {
          setVesselOpacity(vessel.materials, 1);
          vessel.group.scale.setScalar(baseScale);
          return;
        }

        // Entrance: swing in with a quick turn, scale up, fade up.
        setVesselOpacity(vessel.materials, 0);
        spin.rotation.y = -ENTRANCE_SPIN;
        gsap.to(spin.rotation, { y: 0, duration: ENTRANCE_DURATION, ease: 'power3.out', overwrite: true });
        gsap.fromTo(
          vessel.group.scale,
          { x: baseScale * ENTRANCE_SCALE_FROM, y: baseScale * ENTRANCE_SCALE_FROM, z: baseScale * ENTRANCE_SCALE_FROM },
          { x: baseScale, y: baseScale, z: baseScale, duration: ENTRANCE_DURATION, ease: 'power3.out', overwrite: true },
        );
        const entranceFade = { value: 0 };
        gsap.to(entranceFade, {
          value: 1,
          duration: ENTRANCE_DURATION * 0.8,
          ease: 'power2.out',
          onUpdate: () => setVesselOpacity(vessel.materials, entranceFade.value),
        });
      };

      const loadAndMount = () => {
        const cached = vesselCache.get(path);
        if (cached) {
          // A cached vessel may still be parented to spin from before — detach to re-mount cleanly.
          cached.group.parent?.remove(cached.group);
          mountVessel(cached);
          return;
        }
        onStatus({ isLoading: true, percent: -1 });
        loader.load(
          path,
          (gltf) => {
            const prepared = prepareVessel(gltf.scene);
            prepared.group.userData.baseScale = prepared.group.scale.x;
            vesselCache.set(path, prepared);
            mountVessel(prepared);
          },
          (progressEvent) => {
            const percent = progressEvent.total > 0
              ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
              : -1;
            onStatus({ isLoading: true, percent });
          },
          (error) => {
            console.error(`Failed to load vessel: ${path}`, error);
            onStatus({ isLoading: false, percent: 100 });
          },
        );
      };

      if (!replayOnly && activeVessel) {
        // Fade the outgoing vessel down, then bring the next one in.
        const outgoing = activeVessel;
        const exitFade = { value: 1 };
        gsap.to(exitFade, {
          value: 0,
          duration: EXIT_DURATION,
          ease: 'power2.in',
          onUpdate: () => setVesselOpacity(outgoing.materials, exitFade.value),
          onComplete: () => {
            if (outgoing.group.parent === spin && outgoing !== vesselCache.get(path)) {
              spin.remove(outgoing.group);
            }
            loadAndMount();
          },
        });
      } else {
        loadAndMount();
      }
    };
    // The selection effect below drives the first load too, so we don't kick one off
    // here — calling swapTo in both places would fetch the 57 MB vessel twice.
    swapToRef.current = swapTo;

    // ── Pointer parallax (skipped under reduced motion) ──
    const pointerTarget  = { x: 0, y: 0 };
    const pointerCurrent = { x: 0, y: 0 };
    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerTarget.x = ((event.clientX - bounds.left) / bounds.width  - 0.5) * 2;
      pointerTarget.y = ((event.clientY - bounds.top)  / bounds.height - 0.5) * 2;
    };
    if (!reduceMotion) window.addEventListener('pointermove', handlePointerMove);

    // ── Render loop ──
    const clock = new THREE.Clock();
    let frameId = 0;
    const renderFrame = () => {
      frameId = requestAnimationFrame(renderFrame);
      const elapsed = clock.getElapsedTime();

      if (!reduceMotion) {
        spin.rotation.y += AUTO_ROTATE_SPEED;
        pivot.position.y = Math.sin(elapsed * FLOAT_SPEED) * FLOAT_AMPLITUDE;

        pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * PARALLAX_EASE;
        pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * PARALLAX_EASE;
        pivot.rotation.y = pointerCurrent.x * PARALLAX_STRENGTH;
        pivot.rotation.x = pointerCurrent.y * PARALLAX_STRENGTH;

        starfield.rotation.y = elapsed * STAR_DRIFT_SPEED;
      }

      renderer.render(scene, camera);
    };
    renderFrame();

    // ── Resize + responsive placement ──
    const handleResize = () => {
      const width  = canvas.clientWidth  || canvas.offsetWidth;
      const height = canvas.clientHeight || canvas.offsetHeight;
      if (!width || !height) return;
      const aspect = width / height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      // Re-centre the vessel when the layout stacks (portrait / narrow).
      placement.position.x = aspect >= DESKTOP_MIN_ASPECT ? DESKTOP_OFFSET_X : 0;
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas.parentElement ?? canvas);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      gsap.killTweensOf(spin.rotation);
      pmremGenerator.dispose();
      scene.environment?.dispose();
      starfield.geometry.dispose();
      (starfield.material as THREE.Material).dispose();
      renderer.dispose();
      // Cached vessels persist across remounts intentionally; don't dispose their geometry.
    };
    // Setup runs once; selection changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. React to selection: drive the swap whenever the pick changes ──
  useEffect(() => {
    swapToRef.current(modelPath);
    // selectionToken changes on every click so re-picking the same vessel replays the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelPath, selectionToken]);
}
