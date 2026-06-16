import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { gsap } from "gsap";

import { POSITION_VERT, STAR_CORE_FRAG, STAR_CORONA_FRAG } from "./solarShaders";
import type { AddonConfig, SolarPlanet } from "./solarConfig";
import {
  AMBIENT,
  BLOOM,
  CAMERA_FOV,
  ENV_MAP_INTENSITY,
  FOG_DENSITY,
  HERO_CAM_LOOK,
  HERO_CAM_POS,
  ORBIT_RING_OPACITY,
  restDistance,
  STAR,
  STARS,
  TEXTURE_PATH,
  TILT,
  TONE_EXPOSURE,
} from "./solarConfig";

/* ─────────────────────────────────────────────── */
/*  Types                                          */
/* ─────────────────────────────────────────────── */

export interface CameraState {
  posX: number;
  posY: number;
  posZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
}

/* ─────────────────────────────────────────────── */
/*  SolarScene                                     */
/* ─────────────────────────────────────────────── */

export class SolarScene {
  readonly planetPositions: THREE.Vector3[] = [];
  readonly restDistances: number[];
  readonly heroState: CameraState = {
    posX: HERO_CAM_POS[0],
    posY: HERO_CAM_POS[1],
    posZ: HERO_CAM_POS[2],
    lookX: HERO_CAM_LOOK[0],
    lookY: HERO_CAM_LOOK[1],
    lookZ: HERO_CAM_LOOK[2],
  };
  readonly planetStates: CameraState[] = [];

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly isMobile = window.innerWidth < 768;

  private readonly starMesh: THREE.Mesh;
  private readonly starMaterial: THREE.ShaderMaterial;
  private readonly planets: THREE.Mesh[] = [];
  private readonly starField: THREE.Points;
  private readonly textures: THREE.Texture[] = [];
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private readonly environmentRenderTarget: THREE.WebGLRenderTarget;

  /** Holographic add-on orbiter groups — one per planet. */
  private readonly addonGroups: THREE.Group[] = [];
  /** All materials inside each addon group (for opacity control). */
  private readonly addonMaterials: THREE.Material[][] = [];
  /** The GSAP proxy objects controlling opacity per group. */
  private readonly addonOpacities = {
    values: [] as number[],
  };

  private animationFrameId = 0;
  private activePlanetIndex = -1;

  constructor(canvas: HTMLCanvasElement, private readonly planetData: SolarPlanet[]) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    this.restDistances = planetData.map((planet) => restDistance(planet.radius));

    // --- renderer ---
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(viewportWidth, viewportHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = TONE_EXPOSURE;

    // --- scene basics ---
    this.scene.background = new THREE.Color(0x060606);
    this.scene.fog = new THREE.FogExp2(0x060606, FOG_DENSITY);
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, viewportWidth / viewportHeight, 0.1, 800);

    // --- image-based lighting ---
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.environmentRenderTarget = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.environmentRenderTarget.texture;

    // --- blue star light ---
    this.scene.add(new THREE.PointLight(STAR.lightColor, STAR.lightIntensity, 0, 2));
    this.scene.add(new THREE.AmbientLight(AMBIENT.color, AMBIENT.intensity));

    // --- star core + corona ---
    this.starMaterial = new THREE.ShaderMaterial({
      vertexShader: POSITION_VERT,
      fragmentShader: STAR_CORE_FRAG,
      uniforms: { uTime: { value: 0 } },
    });
    this.starMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(STAR.radius, 5), this.starMaterial);
    this.scene.add(this.starMesh);

    this.scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(STAR.radius * 1.4, 48, 48),
        new THREE.ShaderMaterial({
          vertexShader: POSITION_VERT,
          fragmentShader: STAR_CORONA_FRAG,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        })
      )
    );

    this.buildPlanets();
    this.starField = this.buildStarField();
    this.composer = this.buildComposer(viewportWidth, viewportHeight);

    this.setCameraState(
      this.heroState.posX,
      this.heroState.posY,
      this.heroState.posZ,
      this.heroState.lookX,
      this.heroState.lookY,
      this.heroState.lookZ
    );
  }

  /* ─────────────────────────────────────────── */
  /*  Build                                      */
  /* ─────────────────────────────────────────── */

  private buildPlanets() {
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.x = TILT;
    this.scene.add(orbitGroup);

    const textureLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.planetData.forEach((planet, index) => {
      // Planet group positioned in space
      const planetGroup = new THREE.Group();
      planetGroup.position.set(
        Math.cos(planet.angle) * planet.orbit,
        planet.yOffset,
        Math.sin(planet.angle) * planet.orbit
      );
      orbitGroup.add(planetGroup);

      // Textured PBR sphere
      const texture = textureLoader.load(TEXTURE_PATH + planet.texture);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      this.textures.push(texture);

      const segmentsLatitude = this.isMobile ? 48 : 96;
      const segmentsLongitude = this.isMobile ? 32 : 64;

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(planet.radius, segmentsLatitude, segmentsLongitude),
        new THREE.MeshStandardMaterial({
          map: texture,
          bumpMap: texture,
          bumpScale: 0.03,
          color: new THREE.Color(planet.tint),
          roughness: 0.92,
          metalness: 0,
          envMapIntensity: ENV_MAP_INTENSITY,
        })
      );
      mesh.rotation.y = Math.random() * Math.PI;
      planetGroup.add(mesh);
      this.planets.push(mesh);

      // Add Saturn Rings if configured
      if (planet.hasRings) {
        const ringTexture = textureLoader.load(TEXTURE_PATH + "8k_saturn_ring_alpha.png");
        this.textures.push(ringTexture);
        const ringGeo = new THREE.RingGeometry(planet.radius * 1.3, planet.radius * 2.2, 64);
        const pos = ringGeo.attributes.position;
        const uvs = ringGeo.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const r = v3.length();
          const normRadius = (r - planet.radius * 1.3) / (planet.radius * 2.2 - planet.radius * 1.3);
          uvs.setXY(i, normRadius, 0.5);
        }
        
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTexture,
          color: 0xffe28b,
          transparent: true,
          side: THREE.DoubleSide,
          opacity: 0.95,
          roughness: 0.8,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2 + 0.2;
        ringMesh.rotation.y = 0.1;
        planetGroup.add(ringMesh);
      }

      // Build holographic add-on orbiters for this planet
      const { group, materials } = this.buildAddons(planet);
      planetGroup.add(group);
      this.addonGroups.push(group);
      this.addonMaterials.push(materials);
      this.addonOpacities.values.push(0);
    });

    this.scene.updateMatrixWorld(true);
    this.planets.forEach((planet) => this.planetPositions.push(planet.getWorldPosition(new THREE.Vector3())));

    // Compute dynamic left-right camera framing
    const UP = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < this.planetPositions.length; i++) {
      const currentPos = this.planetPositions[i];
      const nextPos = i < this.planetPositions.length - 1 ? this.planetPositions[i + 1] : new THREE.Vector3(0, 0, 0);

      const dir = new THREE.Vector3().subVectors(nextPos, currentPos).normalize();
      const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
      const up = new THREE.Vector3().crossVectors(right, dir).normalize();

      const dist = this.restDistances[i];
      const shiftRight = dist * 0.28; 
      const shiftUp = dist * 0.12;
      
      const cameraPos = currentPos.clone()
        .addScaledVector(dir, -dist)
        .addScaledVector(right, shiftRight)
        .addScaledVector(up, shiftUp);

      const lookAtTarget = currentPos.clone().addScaledVector(right, shiftRight * 0.8);

      this.planetStates.push({
        posX: cameraPos.x,
        posY: cameraPos.y,
        posZ: cameraPos.z,
        lookX: lookAtTarget.x,
        lookY: lookAtTarget.y,
        lookZ: lookAtTarget.z,
      });
    }
  }

  private buildAddons(planet: SolarPlanet): { group: THREE.Group; materials: THREE.Material[] } {
    const group = new THREE.Group();
    const materials: THREE.Material[] = [];
    const accent = new THREE.Color(planet.accentColor);
    
    const holoTexture = this.createHoloTexture(planet.accentColor);
    const dashedTexture = this.createDashedRingTexture(planet.accentColor);

    for (const addon of planet.addons) {
      for (let index = 0; index < addon.count; index++) {
        const { mesh, material } = this.createOrbiterMesh(addon, index, accent, holoTexture, dashedTexture);

        const targetOrbitRadius = planet.radius * (addon.orbitRadius[0] + Math.random() * (addon.orbitRadius[1] - addon.orbitRadius[0]));
        const tilt = addon.tilt[0] + Math.random() * (addon.tilt[1] - addon.tilt[0]);

        mesh.userData = {
          kind: addon.kind,
          targetOrbitRadius,
          currentOrbitRadius: 0, // Starts at 0 (core of planet)
          tilt,
          speed: 0.15 + Math.random() * 0.35,
          phase: Math.random() * Math.PI * 2,
        };

        // Start hidden and scaled down
        mesh.scale.set(0.01, 0.01, 0.01);

        group.add(mesh);
        materials.push(material);
      }
    }

    group.visible = false;
    materials.forEach((material) => (material.opacity = 0));

    return { group, materials };
  }

  private createOrbiterMesh(
    addon: AddonConfig,
    index: number,
    accent: THREE.Color,
    holoTexture: THREE.CanvasTexture,
    dashedTexture: THREE.CanvasTexture
  ): { mesh: THREE.Mesh; material: THREE.Material } {
    let geometry: THREE.BufferGeometry;
    let baseOpacity: number;
    let material: THREE.Material;

    switch (addon.kind) {
      case "gear": {
        const radius = 0.8 + Math.random() * 0.6;
        const teeth = Math.floor(12 + Math.random() * 8);
        geometry = this.createGearGeometry(radius, radius * 0.8, radius * 0.6, teeth);
        baseOpacity = 0.9;
        
        material = new THREE.MeshStandardMaterial({
          color: accent,
          metalness: 0.8,
          roughness: 0.2,
          transparent: true,
          opacity: 0,
        });
        break;
      }
      case "dashedRing": {
        const width = 0.4 + Math.random() * 0.3;
        geometry = new THREE.RingGeometry(1.0, 1.0 + width, 64);
        baseOpacity = 0.85;
        
        material = new THREE.MeshBasicMaterial({
          map: dashedTexture,
          color: accent,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        break;
      }
      case "holoPlane": {
        const radius = 1.0 + Math.random() * 0.5;
        const height = 0.4 + Math.random() * 0.4;
        const thetaLength = 0.4 + Math.random() * 0.4;
        geometry = new THREE.CylinderGeometry(radius, radius, height, 16, 1, true, 0, thetaLength);
        baseOpacity = 0.85;
        
        material = new THREE.MeshBasicMaterial({
          map: holoTexture,
          color: accent,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        break;
      }
      case "techRing": {
        const ringRadius = 0.4 + Math.random() * 0.6;
        geometry = new THREE.TorusGeometry(ringRadius, 0.015, 8, 64);
        baseOpacity = 0.65;
        
        material = new THREE.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        break;
      }
      case "particle":
      default: {
        geometry = new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 8, 8);
        baseOpacity = 0.95;
        
        material = new THREE.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        break;
      }
    }

    material.userData = { baseOpacity };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = index;
    
    // Gears rotate around their local Z axis (which we'll point outward or align)
    // To make them lay flat in the orbit plane, we rotate them.
    if (addon.kind === "gear" || addon.kind === "dashedRing") {
      mesh.rotation.x = Math.PI / 2;
    }

    return { mesh, material };
  }

  private createGearGeometry(outerRadius: number, innerRadius: number, holeRadius: number, teethCount: number): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    const angleStep = (Math.PI * 2) / teethCount;
    
    for (let i = 0; i < teethCount; i++) {
      const angle = i * angleStep;
      const halfTooth = angleStep * 0.25;
      
      if (i === 0) shape.moveTo(Math.cos(angle - halfTooth) * innerRadius, Math.sin(angle - halfTooth) * innerRadius);
      else shape.lineTo(Math.cos(angle - halfTooth) * innerRadius, Math.sin(angle - halfTooth) * innerRadius);
      
      shape.lineTo(Math.cos(angle - halfTooth * 0.5) * outerRadius, Math.sin(angle - halfTooth * 0.5) * outerRadius);
      shape.lineTo(Math.cos(angle + halfTooth * 0.5) * outerRadius, Math.sin(angle + halfTooth * 0.5) * outerRadius);
      shape.lineTo(Math.cos(angle + halfTooth) * innerRadius, Math.sin(angle + halfTooth) * innerRadius);
    }
    
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, false);
    shape.holes.push(holePath);

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      curveSegments: 12
    });
  }

  private createDashedRingTexture(accentHex: number): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;
    
    const red = (accentHex >> 16) & 0xff;
    const green = (accentHex >> 8) & 0xff;
    const blue = accentHex & 0xff;
    
    context.translate(256, 256);
    context.strokeStyle = `rgba(${red}, ${green}, ${blue}, 0.9)`;
    
    // Outer dashed arc
    context.lineWidth = 16;
    context.setLineDash([30, 20, 10, 20]);
    context.beginPath();
    context.arc(0, 0, 230, 0, Math.PI * 2);
    context.stroke();
    
    // Inner thin ring
    context.lineWidth = 4;
    context.setLineDash([]);
    context.beginPath();
    context.arc(0, 0, 200, 0, Math.PI * 2);
    context.stroke();
    
    // Tick marks
    context.lineWidth = 6;
    context.setLineDash([4, 60]);
    context.beginPath();
    context.arc(0, 0, 215, 0, Math.PI * 2);
    context.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createHoloTexture(accentHex: number): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;

    const red = (accentHex >> 16) & 0xff;
    const green = (accentHex >> 8) & 0xff;
    const blue = accentHex & 0xff;

    const gradient = context.createLinearGradient(0, 0, 256, 128);
    gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0.95)`);
    gradient.addColorStop(1, `rgba(${Math.max(0, red - 20)}, ${Math.max(0, green - 20)}, ${Math.min(255, blue + 20)}, 0.4)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 128);

    context.fillStyle = "rgba(255, 255, 255, 0.4)";
    context.fillRect(16, 16, 100, 8);
    context.fillRect(16, 36, 160, 40);
    context.fillRect(16, 88, 120, 6);
    context.fillRect(16, 104, 90, 6);

    context.fillStyle = "rgba(0, 0, 0, 0.3)";
    for (let scanY = 0; scanY < 128; scanY += 4) {
      context.fillRect(0, scanY, 256, 2);
    }

    context.strokeStyle = `rgba(${red}, ${green}, ${blue}, 0.9)`;
    context.lineWidth = 4;
    context.strokeRect(2, 2, 252, 124);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private buildStarField() {
    const particleCount = this.isMobile ? STARS.mobile : STARS.desktop;
    const positions = new Float32Array(particleCount * 3);

    for (let index = 0; index < particleCount; index++) {
      const radius = 120 + Math.random() * 280;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const starField = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xebe8e0, size: 0.07, transparent: true, opacity: 0.6 })
    );
    this.scene.add(starField);
    return starField;
  }

  private buildComposer(width: number, height: number) {
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(width, height),
        this.isMobile ? BLOOM.mobileStrength : BLOOM.strength,
        BLOOM.radius,
        BLOOM.threshold
      )
    );
    composer.addPass(new OutputPass());
    return composer;
  }

  /* ─────────────────────────────────────────── */
  /*  Public API                                 */
  /* ─────────────────────────────────────────── */

  setCameraState(posX: number, posY: number, posZ: number, lookX: number, lookY: number, lookZ: number, swayOffset: number = 0, swayLift: number = 0) {
    this.camera.position.set(posX, posY, posZ);
    this.camera.lookAt(lookX, lookY, lookZ);

    if (swayOffset !== 0 || swayLift !== 0) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      
      this.camera.position.addScaledVector(right, swayOffset);
      this.camera.position.addScaledVector(up, swayLift);
    }
  }

  setActivePlanet(index: number) {
    if (this.activePlanetIndex === index) return;
    this.activePlanetIndex = index;

    for (let i = 0; i < this.addonGroups.length; i++) {
      const group = this.addonGroups[i];

      if (i === index) {
        // Fade in opacity
        gsap.killTweensOf(this.addonOpacities.values, i.toString());
        gsap.to(this.addonOpacities.values, { [i]: 1, duration: 1.5, ease: "power2.out" });

        // Physical scale and expansion outward from the planet
        for (const child of group.children) {
          const ud = child.userData;
          
          gsap.killTweensOf(ud);
          gsap.killTweensOf(child.scale);

          // Spring outward to target orbit radius
          gsap.fromTo(
            ud,
            { currentOrbitRadius: 0 },
            { currentOrbitRadius: ud.targetOrbitRadius, duration: 2.0, ease: "back.out(1.2)", delay: Math.random() * 0.2 }
          );

          // Scale up from nothing
          gsap.fromTo(
            child.scale,
            { x: 0.01, y: 0.01, z: 0.01 },
            { x: 1, y: 1, z: 1, duration: 2.0, ease: "back.out(1.2)", delay: Math.random() * 0.2 }
          );
        }
      } else {
        // Fade out gracefully
        gsap.to(this.addonOpacities.values, { [i]: 0, duration: 0.8, ease: "power2.inOut" });

        // Shrink back into the planet
        for (const child of group.children) {
          const ud = child.userData;
          gsap.to(ud, { currentOrbitRadius: 0, duration: 0.8, ease: "power2.in" });
          gsap.to(child.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.8, ease: "power2.in" });
        }
      }
    }
  }

  start() {
    const renderLoop = () => {
      this.animationFrameId = requestAnimationFrame(renderLoop);

      this.starMaterial.uniforms.uTime.value += 0.016;
      this.starMesh.rotation.y += 0.0008;
      this.planets.forEach((planet) => (planet.rotation.y += 0.0012));
      this.starField.rotation.y += 0.0002;

      this.updateAddons();
      this.composer.render();
    };
    this.animationFrameId = requestAnimationFrame(renderLoop);
  }

  private updateAddons() {
    for (let groupIndex = 0; groupIndex < this.addonGroups.length; groupIndex++) {
      const group = this.addonGroups[groupIndex];
      const currentOpacity = this.addonOpacities.values[groupIndex];

      if (currentOpacity < 0.01) {
        group.visible = false;
        continue;
      }
      group.visible = true;

      const materials = this.addonMaterials[groupIndex];
      for (const material of materials) {
        material.opacity = currentOpacity * (material.userData.baseOpacity as number);
      }

      for (const child of group.children) {
        const userData = child.userData;
        if (!userData.phase && userData.phase !== 0) continue;

        userData.phase += userData.speed * 0.016;
        const angle = userData.phase as number;
        const orbitRadius = userData.currentOrbitRadius as number;
        const tilt = userData.tilt as number;

        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        child.position.set(
          cosAngle * orbitRadius,
          sinAngle * orbitRadius * Math.sin(tilt),
          sinAngle * orbitRadius * Math.cos(tilt)
        );

        if (userData.kind === "holoPlane") {
          child.lookAt(this.camera.position);
          child.rotateX(Math.PI / 2);
        } else if (userData.kind === "gear" || userData.kind === "dashedRing") {
          // Keep them flat on the orbital plane but spin them slowly
          child.rotation.z -= userData.speed * 0.008;
        }
      }
    }
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    this.textures.forEach((texture) => texture.dispose());
    this.environmentRenderTarget.dispose();
    this.pmremGenerator.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((mat) => mat.dispose());
        else material.dispose();
      }
    });
    this.composer.dispose();
    this.renderer.dispose();
  }
}
