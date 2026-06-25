import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';
import { DECK_SERVICES } from '../deckServices';
import { DECK_REVEAL_EVENT } from '../deckEvents';

// ── Framing ─────────────────────────────────────────────────────────────
const CAMERA_FOV      = 34;
const CAMERA_DISTANCE = 8.2;
const CAMERA_HEIGHT   = 1.7;
const CAMERA_LOOK_Y   = 0.75; // look slightly down onto the pad so the craft reads as "landed"

// ── Landing pad ─────────────────────────────────────────────────────────
const GROUND_Y          = 0;   // the pad's top surface sits here; the craft hovers just above it
const PAD_MODEL_PATH     = '/models/space_landing.glb';
const PAD_TARGET_WIDTH   = 5.0; // largest horizontal dimension the pad is normalised to
const PAD_Y_OFFSET       = 0.6; // raise the pad so its platform surface comes up under the craft
                                // (the model's bounding box is taller than the visible deck)
// Recolour the pad to fit the scene — a dark slate body with a faint cyan glow in its recesses.
// PAD_COLOR multiplies the model's texture (detail stays; hue shifts); tune these to taste.
const PAD_COLOR              = 0x16222b;
const PAD_EMISSIVE_COLOR     = 0x0b3a45;
const PAD_EMISSIVE_INTENSITY = 0.55;

// ── Starfield ───────────────────────────────────────────────────────────
const STAR_COUNT         = 1200;
const STAR_INNER_RADIUS  = 18;  // a spherical shell so stars wrap the scene without crowding the pad
const STAR_OUTER_RADIUS  = 60;
const STAR_SIZE          = 0.16;
const STAR_OPACITY       = 0.85;
const STAR_DRIFT         = 0.006; // radians/second of slow yaw so the field breathes

// ── Fleet ───────────────────────────────────────────────────────────────
const DRACO_DECODER_PATH = '/draco/';
const TARGET_SIZE = 2.3;  // largest dimension every vessel is normalised to
const BASE_YAW    = -0.6; // resting 3/4 view so hulls don't read flat-on
const SHIP_HOVER  = 0.05; // resting height the centred craft sits above the pad (was floating high)
const FLOAT_AMPLITUDE = 0.06; // gentle hover bob on the centred craft
const FLOAT_SPEED     = 1.1;

// ── Contact shadow (one soft blob on the pad, under the centred craft) ──
const SHADOW_TEXTURE_PX = 256;
const SHADOW_SIZE       = 2.2;
const SHADOW_OPACITY    = 0.5;
const SHADOW_LIFT       = 0.01; // nudge above the pad to avoid z-fighting

// ── Lighting (shared stage rig; the centred craft is always powered) ──
const KEY_LIGHT_COLOR      = 0xfff2e2; // warm key so the hull reads with its own colour, not washed cold
const KEY_LIGHT_INTENSITY  = 2.6;      // stronger + directional → reveals the surface/normal detail
const FILL_LIGHT_COLOR     = 0x9aa7bb; // neutral cool fill
const FILL_LIGHT_INTENSITY = 0.5;
const RIM_LIGHT_COLOR      = 0x00e5ff; // Orbix cyan edge — an accent, not a wash
const RIM_LIGHT_INTENSITY  = 0.7;
const AMBIENT_INTENSITY    = 0.16;     // low so the directional key carves out contrast/texture
const ENV_MAP_INTENSITY    = 1.2;      // a touch more environment reflection so metal/panels read
const TONE_MAPPING_EXPOSURE = 1.18;

// ── Powered-on look ──
// Each hull wears a two-colour fresnel mix (colorCore facing the camera → colorEdge at grazing
// angles, per ship in deckServices). The centred craft sits bright with its internal emissive on;
// a craft leaving the pad dims back as it fades. No external lamp touches the hull — it stays lit
// from above by the shared key light.
const FRESNEL_POWER          = 2.2; // higher → the edge colour hugs the silhouette more tightly
const DORMANT_BRIGHTNESS     = 0.5; // hull multiplier as a craft leaves the pad (dim)
const ACTIVE_BRIGHTNESS      = 1.2; // hull multiplier on the centred craft (bright)
const LIT_EMISSIVE_INTENSITY = 1.3; // the model's own internal lights when centred

// ── Carousel swap (single pad: the current craft flies off, THEN the next flies on) ──
// The two halves are sequenced — the outgoing craft fully clears the pad before the incoming one
// arrives — so they never overlap/clip through each other at centre. Each banks + warps in scale
// for a more cinematic hand-off.
const SWAP_OUT_DURATION = 0.5;  // the leaving craft's exit
const SWAP_GAP          = 0.06; // empty beat on the pad between the two
const SWAP_IN_DURATION  = 0.62; // the arriving craft's entrance
const SWAP_OFFSET_X     = 3.6;  // how far to the side a craft sits while off-stage
const SWAP_OFFSET_Y     = 0.55; // lift as it leaves / arrives so it arcs rather than slides flat
const SWAP_BANK         = 0.5;  // radians the craft rolls (banks) as it slides off / in
const SWAP_ENTER_SCALE  = 0.6;  // the craft warps in from this scale
const SWAP_EXIT_SCALE   = 0.7;  // and shrinks to this as it leaves

// ── Drag-to-rotate + flick (replaces the old passive mouse-track) ──
// A small drag on the craft rotates it (springs back on release); a big horizontal flick switches
// the carousel via onFlick. Distances are in CSS pixels of pointer travel.
const DRAG_YAW_SENSITIVITY   = 0.006; // radians of yaw per pixel dragged
const DRAG_PITCH_SENSITIVITY = 0.004;
const DRAG_YAW_CLAMP         = 1.0;   // most the craft can be turned by a drag
const DRAG_PITCH_CLAMP       = 0.45;
const SPRING_DURATION        = 0.9;   // ease back to the resting view on release
const FLICK_DISTANCE_PX      = 110;   // horizontal travel past this (and horizontally dominant) = a switch

export interface DeckStatus {
  isLoading: boolean;
  /** 0–100 while loading, 100 when the fleet is in. */
  percent: number;
}

interface DeckOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Index of the craft currently on the pad. Read live from the render loop / handlers. */
  activeIndex: number;
  /** A horizontal flick on the craft asks to switch: +1 = next, -1 = previous. */
  onFlick: (direction: number) => void;
  onStatus: (status: DeckStatus) => void;
}

/** One craft's nested rig. stage → lift → spin → vessel lets each transform stay independent:
 *  stage owns the carousel fly-on/off, lift owns the hover height + float bob, spin owns yaw/pitch
 *  (base view + drag rotation). */
interface DeckShip {
  stage: THREE.Group;
  lift: THREE.Group;
  spin: THREE.Group;
  materials: THREE.Material[];
  /** The hull's two mix colours (core → edge), applied as a fresnel blend in the shader. */
  colorCore: THREE.Color;
  colorEdge: THREE.Color;
  /** 0 = dim (leaving), 1 = fully powered (centred). GSAP tweens this → brightness + emissive. */
  litState: { value: number };
  /** 0 = off-stage/invisible, 1 = on the pad. GSAP tweens this → material opacity. */
  presence: { value: number };
}

interface PreparedVessel {
  group: THREE.Group;
  materials: THREE.Material[];
}

// Soft dark blob → the contact shadow the centred craft casts onto the pad.
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

// A spherical shell of faint points wrapping the scene — the "stars in the section". Additive so
// they glint against the black without lighting the pad.
function createStarfield(): THREE.Points {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let starIndex = 0; starIndex < STAR_COUNT; starIndex += 1) {
    // Random direction (uniform on the sphere) × a random radius within the shell.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = STAR_INNER_RADIUS + Math.random() * (STAR_OUTER_RADIUS - STAR_INNER_RADIUS);
    positions[starIndex * 3]     = radius * Math.sin(phi) * Math.cos(theta);
    positions[starIndex * 3 + 1] = radius * Math.cos(phi);
    positions[starIndex * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: STAR_SIZE,
    sizeAttenuation: true,
    transparent: true,
    opacity: STAR_OPACITY,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geometry, material);
}

function collectMaterials(root: THREE.Object3D): THREE.Material[] {
  const materials: THREE.Material[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of meshMaterials) {
        // Transparency is needed for the swap fades; remember the design opacity.
        material.transparent = true;
        material.userData.baseOpacity = material.opacity;
        if (material instanceof THREE.MeshStandardMaterial) {
          // Let the environment read a little stronger so metal + painted panels show.
          material.envMapIntensity = ENV_MAP_INTENSITY;
        }
        materials.push(material);
      }
    }
  });
  return materials;
}

// Patch a hull material so its base colour becomes a two-colour fresnel mix (colorCore where the
// surface faces the camera → colorEdge at grazing angles) scaled by a brightness the state drives.
// The brightness lives in a uniform object on userData so applyLitState can animate it (dim when
// leaving, bright when centred) without recompiling.
function setupHullTint(
  material: THREE.MeshStandardMaterial,
  colorCore: THREE.Color,
  colorEdge: THREE.Color,
) {
  const brightnessUniform = { value: ACTIVE_BRIGHTNESS };
  material.userData.tintBrightness = brightnessUniform;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uColorCore = { value: colorCore };
    shader.uniforms.uColorEdge = { value: colorEdge };
    shader.uniforms.uTintBrightness = brightnessUniform;
    shader.uniforms.uFresnelPower = { value: FRESNEL_POWER };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uColorCore;
        uniform vec3 uColorEdge;
        uniform float uTintBrightness;
        uniform float uFresnelPower;`,
      )
      // normal (view space) + vViewPosition are both available after this chunk; diffuseColor was
      // set earlier in <color_fragment> and is still in scope for the lighting below.
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        float hullFresnel = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), uFresnelPower);
        diffuseColor.rgb *= mix(uColorCore, uColorEdge, hullFresnel) * uTintBrightness;`,
      );
  };
  material.needsUpdate = true;
}

// Centre the model, scale so every hull reads at the same size, and rest its base on y = 0 (origin
// at the base, not the centre) so a craft sits ON the pad when its rig is at y = 0.
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
  // Shift the (centred) hull up by half its scaled height so its base lands at y = 0.
  inner.position.y = (size.y * normalisedScale) / 2;

  const group = new THREE.Group();
  group.add(inner);

  return { group, materials: collectMaterials(group) };
}

export function useServicesDeck({ canvasRef, activeIndex, onFlick, onStatus }: DeckOptions) {
  // The render loop and the swap logic read the freshest selection through a ref, so the
  // persistent setup effect never re-runs when the carousel index changes.
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Latest onFlick, so the drag handlers (set up once) always call the current closure.
  const onFlickRef = useRef(onFlick);
  onFlickRef.current = onFlick;

  // Set up inside the persistent effect; called from the selection effect below so an index
  // change re-stages the existing scene instead of rebuilding it.
  const setStageRef = useRef<(index: number) => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = prefersReducedMotion();

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Neutral tone mapping holds the hull colours instead of desaturating highlights the way ACES
    // does — the fleet read flat/grey under ACES.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    camera.lookAt(0, CAMERA_LOOK_Y, 0);

    // Image-based lighting gives the metal real reflections without shipping an HDR.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;

    // Warm key + neutral fill + a cyan rim that traces the hull's edge.
    const keyLight = new THREE.DirectionalLight(KEY_LIGHT_COLOR, KEY_LIGHT_INTENSITY);
    keyLight.position.set(4, 7, 5);
    const fillLight = new THREE.DirectionalLight(FILL_LIGHT_COLOR, FILL_LIGHT_INTENSITY);
    fillLight.position.set(-6, -1, 2);
    const rimLight = new THREE.DirectionalLight(RIM_LIGHT_COLOR, RIM_LIGHT_INTENSITY);
    rimLight.position.set(-3, 3, -6);
    scene.add(keyLight, fillLight, rimLight, new THREE.AmbientLight(0xffffff, AMBIENT_INTENSITY));

    // ── Starfield ──
    const starfield = createStarfield();
    scene.add(starfield);

    // ── Contact shadow (one blob centred on the pad) ──
    const shadowTexture  = createShadowTexture();
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: SHADOW_OPACITY,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(SHADOW_SIZE, SHADOW_SIZE), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = GROUND_Y + SHADOW_LIFT;
    scene.add(shadow);

    // ── Ship rigs (created empty up-front so status works before models arrive) ──
    const ships: DeckShip[] = DECK_SERVICES.map((service) => {
      const stage = new THREE.Group();
      const lift  = new THREE.Group();
      const spin  = new THREE.Group();
      spin.rotation.y = BASE_YAW;
      lift.position.y = SHIP_HOVER;
      lift.add(spin);
      stage.add(lift);
      scene.add(stage);

      return {
        stage,
        lift,
        spin,
        materials: [],
        colorCore: new THREE.Color(service.colorCore),
        colorEdge: new THREE.Color(service.colorEdge),
        litState: { value: 0 },
        presence: { value: 0 },
      };
    });

    // Push a ship's lit value (0..1) onto its hull brightness + internal emissive strength.
    const applyLitState = (ship: DeckShip) => {
      const brightness = THREE.MathUtils.lerp(DORMANT_BRIGHTNESS, ACTIVE_BRIGHTNESS, ship.litState.value);
      ship.materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          const tintBrightness = material.userData.tintBrightness as { value: number } | undefined;
          if (tintBrightness) tintBrightness.value = brightness;
          material.emissiveIntensity = ship.litState.value * LIT_EMISSIVE_INTENSITY;
        }
      });
    };

    // Fold a ship's presence (0 off-stage → 1 on the pad) into its material opacity.
    const applyOpacity = (ship: DeckShip) => {
      ship.materials.forEach((material) => {
        const baseOpacity = (material.userData.baseOpacity as number | undefined) ?? 1;
        material.opacity = baseOpacity * ship.presence.value;
      });
    };

    // Snap a ship to its off-stage parked pose (invisible, waiting at the side).
    const parkShip = (ship: DeckShip, fromX: number) => {
      gsap.killTweensOf([ship.stage.position, ship.stage.rotation, ship.stage.scale, ship.presence, ship.litState]);
      ship.stage.position.set(fromX, SWAP_OFFSET_Y, 0);
      ship.stage.rotation.set(0, 0, 0);
      ship.stage.scale.setScalar(1);
      ship.presence.value = 0;
      ship.litState.value = 0;
      applyOpacity(ship);
      applyLitState(ship);
    };

    // Which craft is currently staged. Initialised to the mount index so the first selection
    // effect (same index) is a no-op rather than a phantom swap.
    let stagedIndex = activeIndexRef.current;

    // Warp a craft onto the pad: snap it off-stage (banked + shrunk, hidden) then ease it to centre.
    // `delay` lets the swap hold it off until the outgoing craft has cleared.
    const enterShip = (ship: DeckShip, direction: number, delay: number) => {
      gsap.killTweensOf([ship.stage.position, ship.stage.rotation, ship.stage.scale, ship.presence, ship.litState]);
      ship.stage.position.set(direction * SWAP_OFFSET_X, SWAP_OFFSET_Y, 0);
      ship.stage.rotation.set(0, 0, direction * SWAP_BANK);
      ship.stage.scale.setScalar(SWAP_ENTER_SCALE);
      ship.spin.rotation.set(0, BASE_YAW, 0);
      ship.presence.value = 0;
      applyOpacity(ship);

      gsap.to(ship.stage.position, {
        x: 0, y: 0, z: 0, duration: SWAP_IN_DURATION, delay, ease: 'power3.out', overwrite: true,
      });
      gsap.to(ship.stage.rotation, {
        z: 0, duration: SWAP_IN_DURATION, delay, ease: 'power3.out', overwrite: true,
      });
      gsap.to(ship.stage.scale, {
        x: 1, y: 1, z: 1, duration: SWAP_IN_DURATION, delay, ease: 'back.out(1.5)', overwrite: true,
      });
      gsap.to(ship.presence, {
        value: 1, duration: SWAP_IN_DURATION * 0.7, delay, ease: 'power2.out', overwrite: true,
        onUpdate: () => applyOpacity(ship),
      });
      gsap.to(ship.litState, {
        value: 1, duration: SWAP_IN_DURATION, delay, ease: 'power2.out', overwrite: true,
        onUpdate: () => applyLitState(ship),
      });
    };

    // Fly a craft off the pad toward the trailing side — banking, shrinking, dimming, fading.
    const exitShip = (ship: DeckShip, direction: number) => {
      gsap.killTweensOf([ship.stage.position, ship.stage.rotation, ship.stage.scale, ship.presence, ship.litState]);
      gsap.to(ship.stage.position, {
        x: -direction * SWAP_OFFSET_X, y: SWAP_OFFSET_Y, z: 0,
        duration: SWAP_OUT_DURATION, ease: 'power3.in', overwrite: true,
      });
      gsap.to(ship.stage.rotation, {
        z: -direction * SWAP_BANK, duration: SWAP_OUT_DURATION, ease: 'power2.in', overwrite: true,
      });
      gsap.to(ship.stage.scale, {
        x: SWAP_EXIT_SCALE, y: SWAP_EXIT_SCALE, z: SWAP_EXIT_SCALE,
        duration: SWAP_OUT_DURATION, ease: 'power2.in', overwrite: true,
      });
      gsap.to(ship.presence, {
        value: 0, duration: SWAP_OUT_DURATION, ease: 'power2.in', overwrite: true,
        onUpdate: () => applyOpacity(ship),
      });
      gsap.to(ship.litState, {
        value: 0, duration: SWAP_OUT_DURATION, ease: 'power2.in', overwrite: true,
        onUpdate: () => applyLitState(ship),
      });
    };

    // Snap a craft straight onto the pad, no animation (reduced motion).
    const snapToCenter = (ship: DeckShip) => {
      gsap.killTweensOf([ship.stage.position, ship.stage.rotation, ship.stage.scale, ship.presence, ship.litState]);
      ship.stage.position.set(0, 0, 0);
      ship.stage.rotation.set(0, 0, 0);
      ship.stage.scale.setScalar(1);
      ship.spin.rotation.set(0, BASE_YAW, 0);
      ship.presence.value = 1;
      ship.litState.value = 1;
      applyOpacity(ship);
      applyLitState(ship);
    };

    // Fly the current craft off the pad and — once it has cleared — the next one on. Direction
    // (+1 next / −1 prev) decides which side each enters/leaves from, so the swap reads as the
    // carousel moving. The arrival is delayed past the exit so the two never collide at centre.
    const enterDelay = SWAP_OUT_DURATION + SWAP_GAP;
    const setStage = (nextIndex: number) => {
      if (nextIndex === stagedIndex && ships[nextIndex]?.presence.value === 1) return;
      const direction = nextIndex > stagedIndex ? 1 : -1;
      const previousIndex = stagedIndex;
      stagedIndex = nextIndex;

      ships.forEach((ship, index) => {
        const isCenter  = index === nextIndex;
        const isLeaving = index === previousIndex && previousIndex !== nextIndex;
        if (reduceMotion) {
          if (isCenter) snapToCenter(ship);
          else parkShip(ship, direction * SWAP_OFFSET_X);
        } else if (isCenter) {
          enterShip(ship, direction, enterDelay);
        } else if (isLeaving) {
          exitShip(ship, direction);
        } else {
          parkShip(ship, direction * SWAP_OFFSET_X);
        }
      });
    };
    setStageRef.current = setStage;

    // Replay the whole entrance for the currently-staged craft — fired by DECK_REVEAL_EVENT every
    // time the section scrolls back into view, so "scroll away then back" runs the animation again.
    const replayEntrance = () => {
      const index = activeIndexRef.current;
      stagedIndex = index;
      ships.forEach((ship, shipIndex) => {
        if (shipIndex !== index) {
          parkShip(ship, SWAP_OFFSET_X);
        } else if (reduceMotion) {
          snapToCenter(ship);
        } else {
          // Nothing is leaving, so it flies straight in (no exit delay).
          enterShip(ship, 1, 0);
        }
      });
    };
    window.addEventListener(DECK_REVEAL_EVENT, replayEntrance);

    // ── Load the landing pad (once) ──
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    let padGroup: THREE.Group | null = null;
    gltfLoader.load(
      PAD_MODEL_PATH,
      (gltf) => {
        const loadedScene = gltf.scene;
        // Retint the pad to the scene palette.
        loadedScene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const padMaterials = Array.isArray(child.material) ? child.material : [child.material];
            padMaterials.forEach((material) => {
              if (material instanceof THREE.MeshStandardMaterial) {
                material.color.set(PAD_COLOR);
                material.emissive.set(PAD_EMISSIVE_COLOR);
                material.emissiveIntensity = PAD_EMISSIVE_INTENSITY;
                material.envMapIntensity = ENV_MAP_INTENSITY;
              }
            });
          }
        });
        const boundingBox = new THREE.Box3().setFromObject(loadedScene);
        const size   = boundingBox.getSize(new THREE.Vector3());
        const center = boundingBox.getCenter(new THREE.Vector3());
        loadedScene.position.sub(center);

        const padScale = PAD_TARGET_WIDTH / (Math.max(size.x, size.z) || 1);
        const scaledHeight = size.y * padScale;
        const group = new THREE.Group();
        group.scale.setScalar(padScale);
        group.add(loadedScene);
        // Align the pad's top with the ground so the craft hovers just above the surface.
        group.position.y = GROUND_Y - scaledHeight / 2 + PAD_Y_OFFSET;
        scene.add(group);
        padGroup = group;
      },
      undefined,
      (error) => console.error(`Failed to load landing pad: ${PAD_MODEL_PATH}`, error),
    );

    // ── Load the four vessels (Draco-compressed) ──
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
          // Give every hull material its two-colour mix, then reflect its current staged state.
          ship.materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              setupHullTint(material, ship.colorCore, ship.colorEdge);
            }
          });

          // The centred craft shows immediately; the rest wait off-stage. (Materials only exist
          // now, so the initial pose has to be applied after the model arrives.)
          if (index === stagedIndex) {
            ship.stage.position.set(0, 0, 0);
            ship.presence.value = 1;
            ship.litState.value = 1;
          } else {
            ship.stage.position.set(SWAP_OFFSET_X, SWAP_OFFSET_Y, 0);
            ship.presence.value = 0;
            ship.litState.value = 0;
          }
          applyOpacity(ship);
          applyLitState(ship);

          loadProgress[index] = 1;
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

    // ── Drag-to-rotate + flick ──
    // Pointer down on the canvas grabs the centred craft. Dragging rotates it; on release a big
    // horizontal travel is read as a flick (switch carousel), otherwise the craft springs back.
    const drag = { active: false, startX: 0, startY: 0, startTime: 0 };

    const activeShip = () => ships[activeIndexRef.current];

    const handlePointerDown = (event: PointerEvent) => {
      if (reduceMotion) return;
      drag.active = true;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      drag.startTime = performance.now();
      const ship = activeShip();
      if (ship) gsap.killTweensOf(ship.spin.rotation);
      canvas.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!drag.active) return;
      const ship = activeShip();
      if (!ship) return;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      ship.spin.rotation.y = BASE_YAW + THREE.MathUtils.clamp(
        deltaX * DRAG_YAW_SENSITIVITY, -DRAG_YAW_CLAMP, DRAG_YAW_CLAMP,
      );
      ship.spin.rotation.x = THREE.MathUtils.clamp(
        deltaY * DRAG_PITCH_SENSITIVITY, -DRAG_PITCH_CLAMP, DRAG_PITCH_CLAMP,
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!drag.active) return;
      drag.active = false;
      canvas.releasePointerCapture?.(event.pointerId);

      const totalX = event.clientX - drag.startX;
      const totalY = event.clientY - drag.startY;
      const isFlick = Math.abs(totalX) > FLICK_DISTANCE_PX && Math.abs(totalX) > Math.abs(totalY);

      // Always ease the craft back to its resting view; if it was a flick, also ask to switch.
      const ship = activeShip();
      if (ship) {
        gsap.to(ship.spin.rotation, {
          x: 0, y: BASE_YAW, duration: SPRING_DURATION, ease: 'elastic.out(1, 0.5)', overwrite: true,
        });
      }
      if (isFlick) {
        // Dragging the craft left pushes it away → reveal the next craft (and vice-versa).
        onFlickRef.current(totalX < 0 ? 1 : -1);
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // ── Render loop ──
    const clock = new THREE.Clock();
    let frameId = 0;
    const renderFrame = () => {
      frameId = requestAnimationFrame(renderFrame);

      const elapsed = clock.getElapsedTime();
      starfield.rotation.y = elapsed * STAR_DRIFT;

      if (!reduceMotion) {
        const centred = activeIndexRef.current;
        ships.forEach((ship, index) => {
          // Only the centred craft gets the gentle float bob; the rest rest flat.
          const floatOffset = index === centred ? Math.sin(elapsed * FLOAT_SPEED) * FLOAT_AMPLITUDE : 0;
          ship.lift.position.y = SHIP_HOVER + floatOffset;
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
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas.parentElement ?? canvas);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener(DECK_REVEAL_EVENT, replayEntrance);
      // Stop any running tweens, then dispose every loaded hull's geometry + materials.
      ships.forEach((ship) => {
        gsap.killTweensOf(ship.litState);
        gsap.killTweensOf(ship.presence);
        gsap.killTweensOf(ship.stage.position);
        gsap.killTweensOf(ship.stage.rotation);
        gsap.killTweensOf(ship.stage.scale);
        gsap.killTweensOf(ship.spin.rotation);
        ship.spin.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
            meshMaterials.forEach((material) => material.dispose());
          }
        });
      });
      padGroup?.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
          meshMaterials.forEach((material) => material.dispose());
        }
      });
      dracoLoader.dispose();
      shadow.geometry.dispose();
      shadowMaterial.dispose();
      shadowTexture.dispose();
      starfield.geometry.dispose();
      (starfield.material as THREE.Material).dispose();
      pmremGenerator.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    };
    // Setup runs once; selection changes are read live via activeIndexRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to carousel index changes: re-stage the existing scene (fly current off, next on).
  useEffect(() => {
    setStageRef.current(activeIndex);
  }, [activeIndex]);
}
