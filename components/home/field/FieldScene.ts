import * as THREE from "three";
import { GPUComputationRenderer, type Variable } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { POINT_FRAG, POINT_VERT, POSITION_SHADER, VELOCITY_SHADER } from "./glsl";
import {
  BRAID_CAM, BRAID_SIM, CAMERA_STOPS, CAM_DIST, COLORS, CORE_MODE, CRYSTAL_CAM, CRYSTAL_SIM,
  FOV, GAP, PARALLAX, PLANET_HOVER_X, PLANET_LABEL, PLANET_LANE, POINT, SEGMENTS,
  SHAPE_FRACTION, SHAPE_W, WARP_CAM, WARP_SIM, type CoreTransition,
} from "./config";
import type { FieldTargets } from "./shapes";

/**
 * Owns the WebGL side of the field: a GPGPU particle simulation (position +
 * velocity ping-pong targets) rendered as a single Points draw call — no
 * post-processing pass; the grade comes from additive blending, depth fade
 * and the DOM grain/vignette layers.
 *
 * The camera is a travelling rig: each destination has its own attitude
 * (CAMERA_STOPS) and each leg of the journey its own manoeuvre (SEGMENTS) —
 * vortex pull, formation orbit, banking stream run, docking dolly. GSAP
 * drives the public fields; the render loop reads them every frame.
 */
export class FieldScene {
  /** 0..stops-1 — fractional position along the journey, tweened by scroll. */
  journeyPos = 0;
  /** press-and-hold collapse, 0..1 */
  hold = 0;
  /** 1 → all targets overridden to the seed point at the origin. */
  intro = 1;
  /** Blend toward `hoverTexture` while parked (project-row planets). */
  hoverMix = 0;
  hoverTexture: THREE.Texture | null = null;

  /** Pointer projected onto the active formation plane (world space). */
  readonly pointerWorld = new THREE.Vector3(0, 0, 1e6);

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly gpu: GPUComputationRenderer;
  private readonly posVar: Variable;
  private readonly velVar: Variable;
  private readonly velUniforms: Record<string, THREE.IUniform>;
  private readonly pointMat: THREE.ShaderMaterial;
  private readonly points: THREE.Points;
  private readonly targets: FieldTargets;
  /** Active final-leg showpiece (1 braid · 2 crystal · 3 warp); see config CORE_MODE. */
  private readonly coreMode: number;

  private lastFrameMs = 0;
  private time = 0;
  private burstAge = 10;
  private frameId = 0;
  private readonly pointerNdc = new THREE.Vector2(2, 2);
  private readonly pointerLerped = new THREE.Vector2();
  private readonly tmp = new THREE.Vector3();
  private readonly focus = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, simSize: number, targets: FieldTargets, transition: CoreTransition) {
    this.targets = targets;
    this.coreMode = CORE_MODE[transition];
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = w < 768;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(COLORS.bg, 1);

    this.camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 400);
    this.camera.position.set(0, 0, CAM_DIST);

    /* ── simulation ── */
    this.gpu = new GPUComputationRenderer(simSize, simSize, this.renderer);

    const pos0 = this.gpu.createTexture();
    const vel0 = this.gpu.createTexture();
    const pd = pos0.image.data as Float32Array;
    for (let i = 0; i < simSize * simSize; i++) {
      // seed: a tight cluster at the origin; w carries a per-particle random
      pd[i * 4] = (Math.random() - 0.5) * 3;
      pd[i * 4 + 1] = (Math.random() - 0.5) * 3;
      pd[i * 4 + 2] = (Math.random() - 0.5) * 3;
      pd[i * 4 + 3] = Math.random();
    }

    this.posVar = this.gpu.addVariable("texturePosition", POSITION_SHADER, pos0);
    this.velVar = this.gpu.addVariable("textureVelocity", VELOCITY_SHADER, vel0);
    this.gpu.setVariableDependencies(this.posVar, [this.posVar, this.velVar]);
    this.gpu.setVariableDependencies(this.velVar, [this.posVar, this.velVar]);

    this.velUniforms = this.velVar.material.uniforms;
    Object.assign(this.velUniforms, {
      uDelta: { value: 0 },
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uFormless: { value: 0 },
      uIntro: { value: 1 },
      uShapeScale: { value: this.computeShapeScale() },
      uHold: { value: 0 },
      uBurstAge: { value: 10 },
      uTravelMode: { value: 0 },
      uFlow: { value: 0 },
      uCenterZ: { value: 0 },
      uCoreMode: { value: 0 },
      uCoreInfall: { value: 0 },
      uCoreEvent: { value: 0 },
      uPointer: { value: new THREE.Vector3(0, 0, 1e6) },
      uBurstPos: { value: new THREE.Vector3() },
      uTargetA: { value: targets.stops[0] },
      uTargetB: { value: targets.stops[0] },
    });
    this.posVar.material.uniforms.uDelta = { value: 0 };

    const err = this.gpu.init();
    if (err) console.error("[field] GPGPU init failed:", err);

    /* ── render side: one Points draw ── */
    const count = simSize * simSize;
    const refs = new Float32Array(count * 3);
    // Per-particle rest-lane planet index (i % 4 for formation particles, −1 for
    // free drifters) so the shader can light each lane planet around its own
    // centre. The planet lane formation uses the same i % 4 mapping (shapes.ts).
    const planetIndex = new Float32Array(count);
    // First `band` of the formation's slots spell the hovered project's name
    // (see planetVariant); flag them so the shader tints the name accent.
    const labels = new Float32Array(count);
    const shapeCount = Math.floor(count * SHAPE_FRACTION);
    const labelCount = Math.floor(shapeCount * PLANET_LABEL.band);
    for (let i = 0; i < count; i++) {
      refs[i * 3] = ((i % simSize) + 0.5) / simSize;
      refs[i * 3 + 1] = (Math.floor(i / simSize) + 0.5) / simSize;
      planetIndex[i] = i < shapeCount ? i % 4 : -1;
      if (i < labelCount) labels[i] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(refs, 3));
    geo.setAttribute("aPlanet", new THREE.BufferAttribute(planetIndex, 1));
    geo.setAttribute("aLabel", new THREE.BufferAttribute(labels, 1));

    this.pointMat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        texturePosition: { value: null },
        textureVelocity: { value: null },
        uSize: { value: isMobile ? POINT.mobileSize : POINT.size },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uColor: { value: new THREE.Color(COLORS.fg) },
        uAccent: { value: new THREE.Color(COLORS.accent) },
        uOpacity: { value: POINT.opacity },
        uHoverMix: { value: 0 },
        uCrystalGlint: { value: 0 },
        uLaneShade: { value: 0 },
        uPlanetCenter: { value: new THREE.Vector3(PLANET_HOVER_X, 0, -GAP * 2) },
        uLaneCenters: {
          value: PLANET_LANE.xs.map(
            (x, k) => new THREE.Vector3(x, PLANET_LANE.ys[k], PLANET_LANE.zs[k] - GAP * 2)
          ),
        },
      },
    });
    this.points = new THREE.Points(geo, this.pointMat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.onPointerMove = this.onPointerMove.bind(this);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
  }

  /** Detonate the release shockwave at the current cursor position. */
  burst() {
    (this.velUniforms.uBurstPos.value as THREE.Vector3).copy(this.pointerWorld);
    this.burstAge = 0;
  }

  start() {
    this.lastFrameMs = performance.now();
    const loop = () => {
      this.frameId = requestAnimationFrame(loop);
      const now = performance.now();
      const delta = (now - this.lastFrameMs) / 1000;
      this.lastFrameMs = now;
      this.update(Math.min(delta, 0.05));
    };
    this.frameId = requestAnimationFrame(loop);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.velUniforms.uShapeScale.value = this.computeShapeScale();
  }

  dispose() {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener("pointermove", this.onPointerMove);
    this.gpu.dispose();
    this.points.geometry.dispose();
    this.pointMat.dispose();
    this.targets.stops.forEach((t) => t.dispose());
    this.targets.planets.forEach((t) => t.dispose());
    this.renderer.dispose();
  }

  /* ── internals ─────────────────────────────────────── */

  private onPointerMove(e: PointerEvent) {
    this.pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }

  /** Keep the wordmark inside the viewport on narrow screens. */
  private computeShapeScale() {
    const visW = 2 * CAM_DIST * Math.tan((FOV * Math.PI) / 360) * (window.innerWidth / window.innerHeight);
    return THREE.MathUtils.clamp((visW * 0.86) / SHAPE_W, 0.42, 1.1);
  }

  private update(dt: number) {
    this.time += dt;
    this.burstAge += dt;

    const last = this.targets.stops.length - 1;
    const jp = THREE.MathUtils.clamp(this.journeyPos, 0, last);
    const i = Math.min(Math.floor(jp), last - 1);
    const p = jp - i;
    const swing = Math.sin(p * Math.PI);
    const seg = SEGMENTS[i];
    // The last leg (streams → core) is the collapse showpiece — camera and
    // physics both diverge from the generic per-leg manoeuvre.
    const isFinalLeg = i === last - 1;
    let crystalGlint = 0; // refraction band progress, driven on the crystal leg

    let texA: THREE.Texture = this.targets.stops[i];
    let texB: THREE.Texture = this.targets.stops[i + 1];
    let morph = p;
    let formless = swing;

    // Hover override (project planets) only applies while parked
    if (this.hoverMix > 0.001 && this.hoverTexture && (p < 0.02 || p > 0.98)) {
      texA = this.targets.stops[Math.round(jp)];
      texB = this.hoverTexture;
      morph = this.hoverMix;
      formless = 0;
    }

    /* ── camera rig: per-stop attitude + per-leg manoeuvre ── */
    this.pointerLerped.lerp(this.pointerNdc.x > 1.5 ? this.pointerLerped : this.pointerNdc, PARALLAX.lerp);
    const planeZ = -jp * GAP;
    const a = CAMERA_STOPS[i];
    const b = CAMERA_STOPS[i + 1];

    let az = THREE.MathUtils.lerp(a.az, b.az, p);
    let el = THREE.MathUtils.lerp(a.el, b.el, p);
    let distMul = THREE.MathUtils.lerp(a.dist, b.dist, p);
    let roll = 0;
    let fov = FOV;
    if (isFinalLeg && this.coreMode === 1) {
      // BRAID — spiral along the thread: azimuth arcs out and back with a slight
      // lift and bank, distance eases straight in. Reads as travelling a braid.
      az += swing * BRAID_CAM.sweep;
      el += swing * BRAID_CAM.lift;
      roll = swing * BRAID_CAM.bank;
    } else if (isFinalLeg && this.coreMode === 2) {
      // CRYSTAL — hold back and approach slowly, then a deliberate one-way turn
      // reveals the facets and the camera snaps to rest as the lattice locks. A
      // brief dolly recoil at the lock sells the "click". Stays upright (no roll).
      const approach = THREE.MathUtils.smoothstep(p, 0, CRYSTAL_CAM.lockP);
      const snap = THREE.MathUtils.smoothstep(p, CRYSTAL_CAM.lockP, CRYSTAL_CAM.lockP + 0.06);
      distMul = THREE.MathUtils.lerp(a.dist * CRYSTAL_CAM.pullBack, b.dist, approach);
      distMul -= Math.sin(snap * Math.PI) * CRYSTAL_CAM.recoil; // dip past rest, then settle
      az += THREE.MathUtils.lerp(0, CRYSTAL_CAM.turn, approach); // turn lands and holds
      el += swing * CRYSTAL_CAM.lift;
    } else if (isFinalLeg) {
      // WARP — forward rush: plunge close as the camera flies through the tunnel,
      // tilt during the rush, then settle; a brief fov punch sells the speed.
      const rush = THREE.MathUtils.smoothstep(p, 0.1, 0.7);
      const arrive = THREE.MathUtils.smoothstep(p, 0.7, 1);
      distMul = THREE.MathUtils.lerp(a.dist, b.dist * WARP_CAM.through, rush);
      distMul = THREE.MathUtils.lerp(distMul, b.dist, arrive);
      roll = rush * (1 - arrive) * WARP_CAM.tilt;
      fov = FOV + rush * (1 - arrive) * WARP_CAM.fovKick;
    } else {
      // generic per-leg manoeuvre (untouched legs 1–3)
      az += swing * seg.azSwing;
      distMul *= 1 + swing * seg.dip;
      roll = swing * seg.roll;
    }
    const dist = CAM_DIST * distMul - this.hold * 4;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    this.focus.set(this.pointerLerped.x * PARALLAX.x * 0.4, this.pointerLerped.y * PARALLAX.y * 0.4, planeZ);
    this.camera.position.set(
      this.focus.x + dist * Math.sin(az) * Math.cos(el) + this.pointerLerped.x * PARALLAX.x,
      this.focus.y + dist * Math.sin(el) + this.pointerLerped.y * PARALLAX.y,
      this.focus.z + dist * Math.cos(az) * Math.cos(el)
    );
    this.camera.lookAt(this.focus);
    this.camera.rotateZ(roll + this.pointerLerped.x * PARALLAX.roll);

    /* pointer → world on the active formation plane */
    if (this.pointerNdc.x < 1.5) {
      this.tmp.set(this.pointerNdc.x, this.pointerNdc.y, 0.5).unproject(this.camera);
      this.tmp.sub(this.camera.position).normalize();
      const t = (planeZ - this.camera.position.z) / this.tmp.z;
      if (t > 0) this.pointerWorld.copy(this.camera.position).addScaledVector(this.tmp, t);
    }

    /* ── simulation ── */
    const u = this.velUniforms;
    u.uDelta.value = dt;
    u.uTime.value = this.time;
    u.uMorph.value = morph;
    u.uFormless.value = formless;
    u.uIntro.value = this.intro;
    u.uHold.value = this.hold;
    u.uBurstAge.value = this.burstAge;
    u.uTravelMode.value = formless > 0.001 ? seg.mode : 0;
    u.uFlow.value = Math.max(0, 1 - Math.abs(jp - 3) * 2.5);
    u.uCenterZ.value = planeZ;

    // Final-leg showpiece: the active variant owns the motion. Disable the
    // generic manoeuvre and drive uCoreInfall (primary force) + uCoreEvent
    // (punctuation beat). uFormless tunes how fluid (high) vs. crisp (low) the
    // field stays per variant. Other legs leave these at zero.
    if (isFinalLeg) {
      u.uTravelMode.value = 0;
      u.uCoreMode.value = this.coreMode;
      if (this.coreMode === 1) {
        // braid: ease the weave in (fluid), then coil into the core near the end
        u.uCoreInfall.value = Math.sin(Math.min(p, 1) * Math.PI * 0.5);
        u.uCoreEvent.value = THREE.MathUtils.smoothstep(p, BRAID_SIM.coilFrom, BRAID_SIM.coilTo);
        u.uFormless.value = 1 - THREE.MathUtils.smoothstep(p, 0.85, 1);
      } else if (this.coreMode === 2) {
        // crystal: low noise so it seats crisply onto the lattice, hard lock late
        u.uCoreInfall.value = THREE.MathUtils.smoothstep(p, CRYSTAL_SIM.from, CRYSTAL_SIM.to);
        u.uCoreEvent.value = Math.exp(-Math.pow((p - CRYSTAL_SIM.lockAt) / CRYSTAL_SIM.lockWidth, 2));
        u.uFormless.value = CRYSTAL_SIM.noise * (1 - THREE.MathUtils.smoothstep(p, 0.7, 0.95));
        // refraction glint sweeps across the facets through the lock window
        if (p > CRYSTAL_SIM.glintFrom && p < CRYSTAL_SIM.glintTo) {
          crystalGlint = (p - CRYSTAL_SIM.glintFrom) / (CRYSTAL_SIM.glintTo - CRYSTAL_SIM.glintFrom);
        }
      } else {
        // warp: fluid tunnel rush, then the membrane punch detonates outward
        u.uCoreInfall.value = THREE.MathUtils.smoothstep(p, WARP_SIM.from, WARP_SIM.to);
        u.uCoreEvent.value = Math.exp(-Math.pow((p - WARP_SIM.punchAt) / WARP_SIM.punchWidth, 2));
        u.uFormless.value = 1 - THREE.MathUtils.smoothstep(p, 0.72, 0.96);
      }
    } else {
      u.uCoreMode.value = 0;
      u.uCoreInfall.value = 0;
      u.uCoreEvent.value = 0;
    }
    (u.uPointer.value as THREE.Vector3).copy(this.pointerWorld);
    u.uTargetA.value = texA;
    u.uTargetB.value = texB;
    this.posVar.material.uniforms.uDelta.value = dt;
    this.gpu.compute();

    /* ── draw ── */
    this.pointMat.uniforms.texturePosition.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    this.pointMat.uniforms.textureVelocity.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
    // Planet lighting: the hovered planet (uHoverMix) and the rest-lane planets
    // (only while parked near the planets stop and not hovering) read as lit
    // spheres. The crystal refraction glint rides on the final leg.
    this.pointMat.uniforms.uHoverMix.value = this.hoverMix;
    this.pointMat.uniforms.uLaneShade.value = Math.max(0, 1 - Math.abs(jp - 2) * 1.8) * (1 - this.hoverMix);
    this.pointMat.uniforms.uCrystalGlint.value = crystalGlint;
    this.renderer.render(this.scene, this.camera);
  }
}
