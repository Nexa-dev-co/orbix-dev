import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';
import { DECK_SERVICES } from '../deckServices';
import { DECK_REVEAL_EVENT, deckIsRevealed } from './useDeckReveal';

// ── Framing ─────────────────────────────────────────────────────────────
const CAMERA_FOV      = 34;
const CAMERA_DISTANCE = 8.2;
const CAMERA_HEIGHT   = 1.7;
const CAMERA_LOOK_Y   = 0.75; // look slightly down onto the deck so ships read as "landed"

// ── Ground ──────────────────────────────────────────────────────────────
const GROUND_Y          = 0;    // ships rest with their base on this plane
const GROUND_SIZE       = 40;
const GROUND_TEXTURE_PX = 512;  // radial gradient that fades the floor pool into the dark

// ── Fleet ───────────────────────────────────────────────────────────────
const DRACO_DECODER_PATH = '/draco/';
const TARGET_SIZE = 1.7;  // largest dimension every vessel is normalised to
const SHIP_DEPTH  = 0;    // all craft sit on the z = 0 plane
const BASE_YAW    = -0.6; // resting 3/4 view so hulls don't read flat-on

// ── Contact shadow ──────────────────────────────────────────────────────
const SHADOW_TEXTURE_PX = 256;
const SHADOW_SCALE      = 1.5;   // shadow footprint relative to the hull's footprint
const SHADOW_OPACITY    = 0.6;
const SHADOW_LIFT       = 0.004; // nudge above the ground to avoid z-fighting

// ── Lighting (shared stage rig; per-ship engine lights arrive in a later step) ──
const KEY_LIGHT_INTENSITY  = 2.1;
const FILL_LIGHT_INTENSITY = 0.55;
const RIM_LIGHT_INTENSITY  = 1.4;
const AMBIENT_INTENSITY    = 0.22;
const RIM_LIGHT_COLOR      = 0x00e5ff; // Orbix cyan rim traces each hull's edge

// ── Per-ship engine lights (ramped on hover, and held while a ship is active) ──
const ENGINE_LIGHT_COLOR       = 0x00e5ff;
const ENGINE_LIGHT_INTENSITY   = 6;    // cyan glow when fully lit
const ENGINE_LIGHT_DISTANCE    = 5;
const ENGINE_LIGHT_DECAY       = 2;
const ENGINE_LIGHT_OFFSET_Y    = 0.45; // sits low/front so the hull reads as "engines on"
const ENGINE_LIGHT_OFFSET_Z    = 0.6;
const HOVER_EMISSIVE_INTENSITY = 2;    // boosts the model's own emissive map when lit
const LIGHT_RAMP_DURATION      = 0.5;  // seconds to fade lights in / out

// ── Activation (the clicked ship powers up; the others recede) ──
const FORWARD_STEP          = 1.1;  // active ship eases toward the camera
const ACTIVE_SCALE          = 1.12; // and grows a touch for emphasis
const ACTIVE_LIFT           = 0.35; // rises off the deck
const DIM_PRESENCE          = 0.32; // the rest fade toward the black backdrop
const ACTIVE_TWEEN_DURATION = 0.7;
const FLOAT_AMPLITUDE       = 0.06; // gentle hover bob while active
const FLOAT_SPEED           = 1.1;
const MOUSE_TRACK_YAW       = 0.5;  // radians the active ship yaws toward the pointer
const MOUSE_TRACK_PITCH     = 0.28;
const POINTER_EASE          = 0.06;

// ── Entrance (each hull materialises on its own beat when the deck reveals) ──
const SHIP_REVEAL_STAGGER  = 0.14; // seconds between each hull arriving
const SHIP_REVEAL_DURATION = 0.9;
const SHIP_REVEAL_SCALE_FROM = 0.8; // hulls pop up from slightly small

const DECK_COLUMN_SELECTOR = '.deck-column';

export interface DeckStatus {
  isLoading: boolean;
  /** 0–100 while loading, 100 when the fleet is in. */
  percent: number;
}

interface DeckOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Index of the powered-on craft, or null. Read live from the render loop. */
  activeIndex: number | null;
  /** Index of the craft under the pointer, or null. Read live from the render loop. */
  hoverIndex: number | null;
  onStatus: (status: DeckStatus) => void;
}

/** One craft's nested rig. slot → lift → spin → vessel lets each transform stay
 *  independent: slot owns X (column) + Z (forward step), lift owns the hover height,
 *  spin owns yaw/pitch (base view + mouse tracking). */
interface DeckShip {
  slot: THREE.Group;
  lift: THREE.Group;
  spin: THREE.Group;
  materials: THREE.Material[];
  shadow: THREE.Mesh | null;
  /** Cyan engine light, intensity 0 when dormant. */
  engineLight: THREE.PointLight;
  /** 0 = dark, 1 = fully lit. GSAP tweens this; applyLitState pushes it to light + emissive. */
  litState: { value: number };
  /** 1 = full, DIM_PRESENCE = dimmed. GSAP tweens this; applyOpacity folds it into opacity. */
  presenceState: { value: number };
  /** 0 = not yet entered, 1 = fully arrived. GSAP tweens this on reveal; folded into opacity. */
  revealState: { value: number };
  /** Resting lift height (GSAP tweens it); the render loop adds the float bob on top. */
  liftBase: { value: number };
}

interface PreparedVessel {
  group: THREE.Group;
  materials: THREE.Material[];
  /** Largest horizontal dimension after scaling — used to size the contact shadow. */
  footprint: number;
}

// Soft radial pool painted to a canvas → the ground fades from a faint lit centre into
// the page black, giving the fleet a surface to sit on without a hard plane edge.
function createGroundTexture(): THREE.Texture {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = GROUND_TEXTURE_PX;
  textureCanvas.height = GROUND_TEXTURE_PX;
  const context = textureCanvas.getContext('2d');
  if (context) {
    const center = GROUND_TEXTURE_PX / 2;
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(40, 52, 60, 1)');
    gradient.addColorStop(0.55, 'rgba(14, 18, 22, 1)');
    gradient.addColorStop(1, 'rgba(6, 6, 6, 1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, GROUND_TEXTURE_PX, GROUND_TEXTURE_PX);
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Soft dark blob → the contact shadow each ship casts onto the deck.
function createShadowTexture(): THREE.Texture {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = SHADOW_TEXTURE_PX;
  textureCanvas.height = SHADOW_TEXTURE_PX;
  const context = textureCanvas.getContext('2d');
  if (context) {
    const center = SHADOW_TEXTURE_PX / 2;
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, SHADOW_TEXTURE_PX, SHADOW_TEXTURE_PX);
  }
  return new THREE.CanvasTexture(textureCanvas);
}

function collectMaterials(root: THREE.Object3D): THREE.Material[] {
  const materials: THREE.Material[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of meshMaterials) {
        // Transparency is needed for the entrance/exit fades; remember the design opacity.
        material.transparent = true;
        material.userData.baseOpacity = material.opacity;
        // Dormant = engines dark. Remember the model's emissive strength so hover can ramp
        // back up to it; zero it now so an unselected ship reads as powered-down.
        if (material instanceof THREE.MeshStandardMaterial) {
          material.userData.baseEmissiveIntensity = material.emissiveIntensity;
          material.emissiveIntensity = 0;
        }
        materials.push(material);
      }
    }
  });
  return materials;
}

// Centre the model, scale so every hull reads at the same size, and rest its base on the
// ground (origin at the base, not the centre) so a ship sits ON the deck at slot y = 0.
function prepareVessel(loadedScene: THREE.Group): PreparedVessel {
  const boundingBox = new THREE.Box3().setFromObject(loadedScene);
  const size   = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());
  loadedScene.position.sub(center);

  const largestDimension = Math.max(size.x, size.y, size.z) || 1;
  const normalisedScale  = TARGET_SIZE / largestDimension;

  const inner = new THREE.Group();
  inner.scale.setScalar(normalisedScale);
  inner.add(loadedScene);
  // Shift the (centred) hull up by half its scaled height so its base lands on the ground.
  inner.position.y = (size.y * normalisedScale) / 2;

  const group = new THREE.Group();
  group.add(inner);

  return {
    group,
    materials: collectMaterials(group),
    footprint: Math.max(size.x, size.z) * normalisedScale,
  };
}

export function useServicesDeck({ canvasRef, activeIndex, hoverIndex, onStatus }: DeckOptions) {
  // The render loop and the lights/activation logic read the freshest selection through a
  // ref, so the persistent setup effect never re-runs when a pick changes.
  const selectionRef = useRef({ activeIndex, hoverIndex });
  selectionRef.current = { activeIndex, hoverIndex };

  // Set up inside the persistent effect; called from the selection effect below so a
  // hover/click re-tunes the existing scene instead of rebuilding it.
  const applyShipStatesRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = prefersReducedMotion();

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    camera.lookAt(0, CAMERA_LOOK_Y, 0);

    // Image-based lighting gives the metal real reflections without shipping an HDR.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;

    // Key + cool fill + a cyan rim that traces each hull's edge.
    const keyLight = new THREE.DirectionalLight(0xffffff, KEY_LIGHT_INTENSITY);
    keyLight.position.set(4, 7, 5);
    const fillLight = new THREE.DirectionalLight(0x6f8cff, FILL_LIGHT_INTENSITY);
    fillLight.position.set(-6, -1, 2);
    const rimLight = new THREE.DirectionalLight(RIM_LIGHT_COLOR, RIM_LIGHT_INTENSITY);
    rimLight.position.set(-3, 3, -6);
    scene.add(keyLight, fillLight, rimLight, new THREE.AmbientLight(0xffffff, AMBIENT_INTENSITY));

    // ── Ground pool ──
    const groundTexture  = createGroundTexture();
    const groundMaterial = new THREE.MeshBasicMaterial({
      map: groundTexture,
      transparent: true,
      depthWrite: false,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    scene.add(ground);

    // ── Ship rigs (created empty up-front so layout + status work before models arrive) ──
    const shadowTexture  = createShadowTexture();
    const shadowGeometry = new THREE.PlaneGeometry(1, 1);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: SHADOW_OPACITY,
      depthWrite: false,
    });

    const ships: DeckShip[] = DECK_SERVICES.map(() => {
      const slot = new THREE.Group();
      const lift = new THREE.Group();
      const spin = new THREE.Group();
      spin.rotation.y = BASE_YAW;
      slot.position.z = SHIP_DEPTH;
      lift.add(spin);
      slot.add(lift);

      // Engine light rides with the ship (on lift → follows the hover/float lift + forward
      // step). Off until the ship is hovered or active.
      const engineLight = new THREE.PointLight(
        ENGINE_LIGHT_COLOR,
        0,
        ENGINE_LIGHT_DISTANCE,
        ENGINE_LIGHT_DECAY,
      );
      engineLight.position.set(0, ENGINE_LIGHT_OFFSET_Y, ENGINE_LIGHT_OFFSET_Z);
      lift.add(engineLight);

      scene.add(slot);
      return {
        slot,
        lift,
        spin,
        materials: [],
        shadow: null,
        engineLight,
        litState: { value: 0 },
        presenceState: { value: 1 },
        revealState: { value: 0 },
        liftBase: { value: 0 },
      };
    });

    // Push a ship's lit value (0..1) onto its engine light + emissive strength.
    const applyLitState = (ship: DeckShip) => {
      const litValue = ship.litState.value;
      ship.engineLight.intensity = litValue * ENGINE_LIGHT_INTENSITY;
      ship.materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = litValue * HOVER_EMISSIVE_INTENSITY;
        }
      });
    };

    // Fold a ship's presence (dim) and reveal (entrance) into its material opacity. Dimmed
    // ships sink toward the black backdrop; un-entered ships are fully transparent.
    const applyOpacity = (ship: DeckShip) => {
      const factor = ship.presenceState.value * ship.revealState.value;
      ship.materials.forEach((material) => {
        const baseOpacity = (material.userData.baseOpacity as number | undefined) ?? 1;
        material.opacity = baseOpacity * factor;
      });
    };

    // The fleet's entrance: each hull fades + pops up on its own beat. Fired by the deck
    // reveal once the hero's square has filled (see DECK_REVEAL_EVENT / useDeckReveal).
    const playReveal = () => {
      ships.forEach((ship, index) => {
        if (reduceMotion) {
          ship.revealState.value = 1;
          ship.lift.scale.setScalar(1);
          applyOpacity(ship);
          return;
        }
        gsap.to(ship.revealState, {
          value: 1,
          duration: SHIP_REVEAL_DURATION,
          delay: index * SHIP_REVEAL_STAGGER,
          ease: 'power2.out',
          overwrite: true,
          onUpdate: () => applyOpacity(ship),
        });
        gsap.fromTo(
          ship.lift.scale,
          { x: SHIP_REVEAL_SCALE_FROM, y: SHIP_REVEAL_SCALE_FROM, z: SHIP_REVEAL_SCALE_FROM },
          {
            x: 1,
            y: 1,
            z: 1,
            duration: SHIP_REVEAL_DURATION,
            delay: index * SHIP_REVEAL_STAGGER,
            ease: 'back.out(1.6)',
            overwrite: true,
          },
        );
      });
    };

    // Re-tune the whole fleet for the current hover + active selection:
    //   lights  → on for the hovered or active ship
    //   presence→ dim every ship that's neither, once one is powered up
    //   motion  → only the active ship steps forward / lifts / grows (and only if motion is allowed)
    const applyShipStates = () => {
      const { activeIndex: active, hoverIndex: hovered } = selectionRef.current;
      const somethingActive = active !== null;
      ships.forEach((ship, index) => {
        const isActive  = index === active;
        const isHovered = index === hovered;

        gsap.to(ship.litState, {
          value: isActive || isHovered ? 1 : 0,
          duration: LIGHT_RAMP_DURATION,
          ease: 'power2.out',
          overwrite: true,
          onUpdate: () => applyLitState(ship),
        });

        const presenceTarget = !somethingActive || isActive || isHovered ? 1 : DIM_PRESENCE;
        gsap.to(ship.presenceState, {
          value: presenceTarget,
          duration: ACTIVE_TWEEN_DURATION,
          ease: 'power2.out',
          overwrite: true,
          onUpdate: () => applyOpacity(ship),
        });

        if (!reduceMotion) {
          gsap.to(ship.slot.position, {
            z: isActive ? FORWARD_STEP : 0,
            duration: ACTIVE_TWEEN_DURATION,
            ease: 'power3.out',
            overwrite: true,
          });
          gsap.to(ship.liftBase, {
            value: isActive ? ACTIVE_LIFT : 0,
            duration: ACTIVE_TWEEN_DURATION,
            ease: 'power3.out',
            overwrite: true,
          });
          const scaleTarget = isActive ? ACTIVE_SCALE : 1;
          gsap.to(ship.spin.scale, {
            x: scaleTarget,
            y: scaleTarget,
            z: scaleTarget,
            duration: ACTIVE_TWEEN_DURATION,
            ease: 'power3.out',
            overwrite: true,
          });
        }
      });
    };
    applyShipStatesRef.current = applyShipStates;

    // The deck's DOM reveal fires DECK_REVEAL_EVENT; play the fleet entrance in step. If the
    // reveal already happened before this (dynamically-imported) canvas mounted, catch up.
    window.addEventListener(DECK_REVEAL_EVENT, playReveal);
    if (deckIsRevealed()) playReveal();

    // Map a column's horizontal screen position to a world X on the ship plane, so each
    // ship sits exactly under its DOM label regardless of layout padding / breakpoint.
    const shipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -SHIP_DEPTH);
    const raycaster = new THREE.Raycaster();
    const planeHit  = new THREE.Vector3();
    const projectColumnToWorldX = (normalisedDeviceX: number): number => {
      raycaster.setFromCamera(new THREE.Vector2(normalisedDeviceX, 0), camera);
      const hit = raycaster.ray.intersectPlane(shipPlane, planeHit);
      return hit ? hit.x : normalisedDeviceX * (GROUND_SIZE / 8);
    };

    const layoutShips = () => {
      const width = canvas.clientWidth || canvas.offsetWidth;
      if (!width) return;
      const canvasRect = canvas.getBoundingClientRect();
      const columns = document.querySelectorAll<HTMLElement>(DECK_COLUMN_SELECTOR);
      ships.forEach((ship, index) => {
        const column = columns[index];
        let normalisedDeviceX: number;
        if (column) {
          const columnRect = column.getBoundingClientRect();
          const centerX = columnRect.left + columnRect.width / 2 - canvasRect.left;
          normalisedDeviceX = (centerX / width) * 2 - 1;
        } else {
          // Fallback: even quarters across the frame if the DOM isn't queryable yet.
          normalisedDeviceX = ((index + 0.5) / ships.length) * 2 - 1;
        }
        ship.slot.position.x = projectColumnToWorldX(normalisedDeviceX);
      });
    };

    // ── Load the four vessels (Draco-compressed) ──
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const loadProgress = new Array(ships.length).fill(0);
    const emitStatus = () => {
      const isDone = loadProgress.every((value) => value >= 1);
      const summed = loadProgress.reduce((total, value) => total + value, 0);
      onStatus({ isLoading: !isDone, percent: isDone ? 100 : Math.round((summed / ships.length) * 100) });
    };
    emitStatus();

    DECK_SERVICES.forEach((service, index) => {
      gltfLoader.load(
        service.modelPath,
        (gltf) => {
          const prepared = prepareVessel(gltf.scene);
          const ship = ships[index];
          ship.spin.add(prepared.group);
          ship.materials = prepared.materials;
          // Reflect the current hover/active/reveal state on the freshly-loaded hull.
          applyLitState(ship);
          applyOpacity(ship);

          const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.y = GROUND_Y + SHADOW_LIFT;
          const shadowSize = prepared.footprint * SHADOW_SCALE;
          shadow.scale.set(shadowSize, shadowSize, 1);
          ship.slot.add(shadow);
          ship.shadow = shadow;

          loadProgress[index] = 1;
          layoutShips();
          emitStatus();
        },
        (progressEvent) => {
          if (progressEvent.total > 0) {
            loadProgress[index] = progressEvent.loaded / progressEvent.total;
            emitStatus();
          }
        },
        (error) => {
          console.error(`Failed to load vessel: ${service.modelPath}`, error);
          loadProgress[index] = 1;
          emitStatus();
        },
      );
    });

    // ── Pointer (the active ship yaws/pitches toward the cursor) ──
    const pointerTarget  = { x: 0, y: 0 };
    const pointerCurrent = { x: 0, y: 0 };
    const handlePointerMove = (event: PointerEvent) => {
      pointerTarget.x = (event.clientX / window.innerWidth  - 0.5) * 2;
      pointerTarget.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduceMotion) window.addEventListener('pointermove', handlePointerMove);

    // ── Render loop ──
    const clock = new THREE.Clock();
    let frameId = 0;
    const renderFrame = () => {
      frameId = requestAnimationFrame(renderFrame);

      if (!reduceMotion) {
        const elapsed = clock.getElapsedTime();
        const activeShipIndex = selectionRef.current.activeIndex;
        pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * POINTER_EASE;
        pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * POINTER_EASE;

        ships.forEach((ship, index) => {
          const isActive = index === activeShipIndex;
          // Resting lift (GSAP) + a gentle float bob while active.
          const floatOffset = isActive ? Math.sin(elapsed * FLOAT_SPEED) * FLOAT_AMPLITUDE : 0;
          ship.lift.position.y = ship.liftBase.value + floatOffset;
          // Active ship tracks the cursor; the rest ease back to their resting 3/4 view.
          const targetYaw   = isActive ? BASE_YAW + pointerCurrent.x * MOUSE_TRACK_YAW : BASE_YAW;
          const targetPitch = isActive ? pointerCurrent.y * MOUSE_TRACK_PITCH : 0;
          ship.spin.rotation.y += (targetYaw   - ship.spin.rotation.y) * POINTER_EASE;
          ship.spin.rotation.x += (targetPitch - ship.spin.rotation.x) * POINTER_EASE;
        });
      }

      renderer.render(scene, camera);
    };
    renderFrame();

    // ── Resize ──
    const handleResize = () => {
      const width  = canvas.clientWidth  || canvas.offsetWidth;
      const height = canvas.clientHeight || canvas.offsetHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      layoutShips();
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas.parentElement ?? canvas);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener(DECK_REVEAL_EVENT, playReveal);
      // Dispose every loaded hull's geometry + materials, and stop any running tweens.
      ships.forEach((ship) => {
        gsap.killTweensOf(ship.litState);
        gsap.killTweensOf(ship.presenceState);
        gsap.killTweensOf(ship.revealState);
        gsap.killTweensOf(ship.liftBase);
        gsap.killTweensOf(ship.slot.position);
        gsap.killTweensOf(ship.spin.scale);
        gsap.killTweensOf(ship.lift.scale);
        ship.spin.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
            meshMaterials.forEach((material) => material.dispose());
          }
        });
      });
      dracoLoader.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      shadowTexture.dispose();
      pmremGenerator.dispose();
      scene.environment?.dispose();
      groundTexture.dispose();
      groundMaterial.dispose();
      ground.geometry.dispose();
      renderer.dispose();
    };
    // Setup runs once; selection changes are read live via selectionRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to hover / active changes: re-tune the existing scene (lights now, motion later).
  useEffect(() => {
    applyShipStatesRef.current();
  }, [activeIndex, hoverIndex]);
}
