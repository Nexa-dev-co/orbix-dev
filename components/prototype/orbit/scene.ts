import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { POSITION_VERT, SUN_FRAG, CORONA_FRAG } from "./shaders";
import type { OrbitSection } from "./sections";
import {
  AMBIENT,
  BLOOM,
  CAM_DIR,
  ENV_MAP_INTENSITY,
  FOG_DENSITY,
  restDistance,
  STARS,
  SUN,
  TEXTURE_PATH,
  TILT,
  TONE_EXPOSURE,
} from "./config";

/**
 * Owns the entire WebGL scene: a glowing sun (key light) with a textured PBR
 * planet per section on tilted orbits, image-based lighting, starfield and
 * bloom post-processing. Framework-agnostic — React drives it via `focus()`.
 */
export class OrbitScene {
  /** World position of each planet (camera targets). */
  readonly planetPositions: THREE.Vector3[] = [];
  /** Camera rest distance per planet. */
  readonly restDistances: number[];

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly dir: THREE.Vector3;
  private readonly tmp = new THREE.Vector3();
  private readonly isMobile = window.innerWidth < 768;

  private readonly sun: THREE.Mesh;
  private readonly sunMat: THREE.ShaderMaterial;
  private readonly planets: THREE.Mesh[] = [];
  private readonly stars: THREE.Points;
  private readonly textures: THREE.Texture[] = [];
  private readonly pmrem: THREE.PMREMGenerator;
  private readonly envRT: THREE.WebGLRenderTarget;
  private frameId = 0;

  constructor(canvas: HTMLCanvasElement, private readonly sections: OrbitSection[]) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dir = new THREE.Vector3(...CAM_DIR).normalize();
    this.restDistances = sections.map((s) => restDistance(s.radius));

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

    this.buildPlanets();
    this.stars = this.buildStars();
    this.composer = this.buildComposer(w, h);

    const p0 = this.planetPositions[0];
    this.focus(p0.x, p0.y, p0.z, this.restDistances[0]);
  }

  private buildPlanets() {
    const system = new THREE.Group();
    system.rotation.x = TILT;
    this.scene.add(system);

    const loader = new THREE.TextureLoader();
    const aniso = this.renderer.capabilities.getMaxAnisotropy();

    this.sections.forEach((s) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(s.orbit, 0.012, 3, 240),
        new THREE.MeshBasicMaterial({ color: 0xebe8e0, transparent: true, opacity: 0.07 })
      );
      ring.rotation.x = Math.PI / 2;
      system.add(ring);

      const group = new THREE.Group();
      group.position.set(Math.cos(s.angle) * s.orbit, 0, Math.sin(s.angle) * s.orbit);
      system.add(group);

      const tex = loader.load(TEXTURE_PATH + s.texture);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = aniso;
      this.textures.push(tex);

      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(s.radius, this.isMobile ? 48 : 96, this.isMobile ? 32 : 64),
        new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.03, color: new THREE.Color(s.tint), roughness: 0.92, metalness: 0, envMapIntensity: ENV_MAP_INTENSITY })
      );
      planet.rotation.y = Math.random() * Math.PI;
      group.add(planet);
      this.planets.push(planet);
    });

    this.scene.updateMatrixWorld(true);
    this.planets.forEach((p) => this.planetPositions.push(p.getWorldPosition(new THREE.Vector3())));
  }

  private buildStars() {
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

  private buildComposer(w: number, h: number) {
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), this.isMobile ? BLOOM.mobileStrength : BLOOM.strength, BLOOM.radius, BLOOM.threshold));
    composer.addPass(new OutputPass());
    return composer;
  }

  /** Point the camera at a focus position from the fixed viewing direction. */
  focus(tx: number, ty: number, tz: number, dist: number) {
    this.tmp.set(tx, ty, tz);
    this.camera.position.copy(this.tmp).addScaledVector(this.dir, dist);
    this.camera.lookAt(this.tmp);
  }

  start() {
    const loop = () => {
      this.frameId = requestAnimationFrame(loop);
      this.sunMat.uniforms.uTime.value += 0.016;
      this.sun.rotation.y += 0.0008;
      this.planets.forEach((p) => (p.rotation.y += 0.0012)); // spin in place; positions stay fixed
      this.stars.rotation.y += 0.0002;
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
}
