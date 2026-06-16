import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { POSITION_VERT, SUN_FRAG, CORONA_FRAG } from "./shaders";
import type { DiveStop, PlanetSpec } from "./sections";
import {
  AMBIENT,
  BLOOM,
  CAM_DIR,
  ENV_MAP_INTENSITY,
  FOG_DENSITY,
  INTRO_DIST_SCALE,
  PARALLAX,
  RING,
  STARS,
  SUN,
  TEXTURE_PATH,
  TILT,
  TONE_EXPOSURE,
} from "./config";

/** Camera state shared with the scroll journey — the render loop reads it every frame. */
export interface CamState {
  /** stop indices being travelled between (equal while parked) */
  from: number;
  to: number;
  /** 0 → at `from`, 1 → at `to` */
  blend: number;
  /** distance from the focus point */
  dist: number;
}

/**
 * Owns the entire WebGL world of the homepage dive: a shader sun (the core)
 * with live-orbiting PBR planets on tilted shells, starfield, IBL fill and
 * bloom. The camera *tracks* its focus planet every frame, so the system never
 * stops moving — parked on an orbit, the planet holds still in frame while the
 * rest of the universe drifts behind it. Framework-agnostic; React/GSAP drive
 * it through `cam`, `roll` and `distScale`.
 */
export class DiveScene {
  /** Tweened by the journey for camera banking during travel. */
  roll = 0;
  /** Intro pull-back: multiplies focus distance. Starts near the core. */
  distScale = INTRO_DIST_SCALE;
  /** Bloom pass — journey grades it down near the core for legibility. */
  readonly bloomPass: UnrealBloomPass;

  private cam: CamState = { from: 0, to: 0, blend: 0, dist: 1 };
  private activeRing = -1;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly dir: THREE.Vector3;
  private readonly clock = new THREE.Clock();
  private readonly isMobile = window.innerWidth < 768;

  private readonly sun: THREE.Mesh;
  private readonly sunMat: THREE.ShaderMaterial;
  private readonly carriers: { group: THREE.Group; planet: THREE.Mesh; speed: number }[] = [];
  /** stop index → carrier index (overview/core focus the origin → -1) */
  private readonly stopCarrier: number[] = [];
  /** orbit ring per stop (undefined for overview/core) */
  private readonly rings: (THREE.Mesh | undefined)[] = [];
  private readonly stars: THREE.Points;
  private readonly textures: THREE.Texture[] = [];
  private readonly pmrem: THREE.PMREMGenerator;
  private readonly envRT: THREE.WebGLRenderTarget;
  private readonly system = new THREE.Group();
  private frameId = 0;

  private readonly pointer = new THREE.Vector2();
  private readonly pointerLerped = new THREE.Vector2();
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, stops: DiveStop[], ambient: PlanetSpec[]) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dir = new THREE.Vector3(...CAM_DIR).normalize();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = TONE_EXPOSURE;

    this.scene.background = new THREE.Color(0x060606);
    this.scene.fog = new THREE.FogExp2(0x060606, FOG_DENSITY);
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);

    // image-based lighting → soft fill so dark sides are never pure black
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = this.pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.add(new THREE.PointLight(SUN.lightColor, SUN.lightIntensity, 0, 2));
    this.scene.add(new THREE.AmbientLight(AMBIENT.color, AMBIENT.intensity));

    // sun core + corona
    this.sunMat = new THREE.ShaderMaterial({ vertexShader: POSITION_VERT, fragmentShader: SUN_FRAG, uniforms: { uTime: { value: 0 } } });
    this.sun = new THREE.Mesh(new THREE.IcosahedronGeometry(SUN.radius, 5), this.sunMat);
    this.scene.add(this.sun);
    this.scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(SUN.radius * 1.4, 48, 48),
        new THREE.ShaderMaterial({ vertexShader: POSITION_VERT, fragmentShader: CORONA_FRAG, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })
      )
    );

    this.system.rotation.x = TILT;
    this.scene.add(this.system);

    stops.forEach((s) => {
      if (!s.planet) {
        this.stopCarrier.push(-1);
        this.rings.push(undefined);
        return;
      }
      this.stopCarrier.push(this.buildPlanet(s.planet));
      this.rings.push(this.buildRing(s.planet.orbit));
    });
    ambient.forEach((p) => {
      this.buildPlanet(p);
      this.buildRing(p.orbit);
    });

    this.stars = this.buildStars();
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), this.isMobile ? BLOOM.mobileStrength : BLOOM.strength, BLOOM.radius, BLOOM.threshold);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.onPointerMove = this.onPointerMove.bind(this);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });

    this.applyCamera();
  }

  /** The journey hands over its camera state once; the loop reads it forever. */
  follow(cam: CamState) {
    this.cam = cam;
  }

  /** Brighten the orbit ring the camera is parked on. */
  setActiveRing(stopIndex: number) {
    this.activeRing = stopIndex;
  }

  /** World position the given stop focuses: its live planet, or the core. */
  targetPos(stopIndex: number, out: THREE.Vector3) {
    const c = this.stopCarrier[stopIndex];
    if (c == null || c === -1) return out.set(0, 0, 0);
    return this.carriers[c].planet.getWorldPosition(out);
  }

  start() {
    this.clock.start();
    const loop = () => {
      this.frameId = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);

      this.sunMat.uniforms.uTime.value += dt;
      this.sun.rotation.y += dt * 0.05;
      this.stars.rotation.y += dt * 0.012;
      this.carriers.forEach((c) => {
        c.group.rotation.y += c.speed * dt;
        c.planet.rotation.y += dt * 0.075;
      });

      this.rings.forEach((ring, i) => {
        if (!ring) return;
        const mat = ring.material as THREE.MeshBasicMaterial;
        const target = i === this.activeRing ? RING.active : RING.idle;
        mat.opacity += (target - mat.opacity) * RING.lerp;
      });

      this.pointerLerped.lerp(this.pointer, PARALLAX.lerp);
      this.applyCamera();
      this.composer.render();
    };
    this.frameId = requestAnimationFrame(loop);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  dispose() {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener("pointermove", this.onPointerMove);
    this.textures.forEach((t) => t.dispose());
    this.envRT.dispose();
    this.pmrem.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
    this.composer.dispose();
    this.renderer.dispose();
  }

  /* ── internals ─────────────────────────────────────── */

  private onPointerMove(e: PointerEvent) {
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  }

  /** Re-aim the camera from the live cam state — focus targets move every frame. */
  private applyCamera() {
    const { from, to, blend, dist } = this.cam;
    const focus = this.targetPos(from, this.tmpA).lerp(this.targetPos(to, this.tmpB), blend);
    const d = dist * this.distScale;

    this.camera.position.copy(focus).addScaledVector(this.dir, d);
    this.camera.lookAt(focus);
    // mouse parallax in the camera's own plane, scaled by distance, then re-aim
    this.camera.translateX(this.pointerLerped.x * d * PARALLAX.x);
    this.camera.translateY(-this.pointerLerped.y * d * PARALLAX.y);
    this.camera.lookAt(focus);
    this.camera.rotateZ(this.roll);
  }

  private buildPlanet(spec: PlanetSpec): number {
    const carrier = new THREE.Group();
    carrier.rotation.y = spec.angle;
    this.system.add(carrier);

    const loader = new THREE.TextureLoader();
    const tex = loader.load(TEXTURE_PATH + spec.texture);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textures.push(tex);

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(spec.radius, this.isMobile ? 48 : 96, this.isMobile ? 32 : 64),
      new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.03, color: new THREE.Color(spec.tint), roughness: 0.92, metalness: 0, envMapIntensity: ENV_MAP_INTENSITY })
    );
    planet.position.set(spec.orbit, 0, 0);
    planet.rotation.y = Math.random() * Math.PI;
    carrier.add(planet);

    this.carriers.push({ group: carrier, planet, speed: spec.speed });
    return this.carriers.length - 1;
  }

  private buildRing(orbit: number): THREE.Mesh {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(orbit, 0.012, 3, 240),
      new THREE.MeshBasicMaterial({ color: 0xebe8e0, transparent: true, opacity: RING.idle })
    );
    ring.rotation.x = Math.PI / 2;
    this.system.add(ring);
    return ring;
  }

  private buildStars(): THREE.Points {
    const count = this.isMobile ? STARS.mobile : STARS.desktop;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 26 + Math.random() * 40;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xebe8e0, size: 0.07, transparent: true, opacity: 0.6 }));
    this.scene.add(stars);
    return stars;
  }
}
