import * as THREE from "three";

export interface ThreeContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Resize renderer + camera to the canvas's current client size. */
  handleResize: () => void;
  /** Tear down GPU resources and detach. Call on unmount. */
  dispose: () => void;
}

interface CreateThreeContextOptions {
  canvas: HTMLCanvasElement;
  /** Camera field of view in degrees. */
  fieldOfView?: number;
  /** Cap device pixel ratio — 2 is plenty and keeps fragment cost sane. */
  maxPixelRatio?: number;
  /** Camera far clip plane — raise it for deep scenes like the warp tunnel. */
  farPlane?: number;
}

const DEFAULT_FIELD_OF_VIEW = 55;
const DEFAULT_MAX_PIXEL_RATIO = 2;
const NEAR_PLANE = 0.1;
const DEFAULT_FAR_PLANE = 100;

/*
  Shared Three.js bootstrap: renderer, scene, and a perspective camera wired to
  a canvas. Callers own the render loop and what they add to the scene; this
  just handles the boilerplate and correct sizing/cleanup. Must run client-side
  only (WebGL touches the DOM/GPU) — import dynamically with ssr: false.
*/
export function createThreeContext({
  canvas,
  fieldOfView = DEFAULT_FIELD_OF_VIEW,
  maxPixelRatio = DEFAULT_MAX_PIXEL_RATIO,
  farPlane = DEFAULT_FAR_PLANE,
}: CreateThreeContextOptions): ThreeContext {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));

  const scene = new THREE.Scene();

  const initialAspect = canvas.clientWidth / canvas.clientHeight || 1;
  const camera = new THREE.PerspectiveCamera(
    fieldOfView,
    initialAspect,
    NEAR_PLANE,
    farPlane
  );
  camera.position.z = 5;

  function handleResize(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function dispose(): void {
    renderer.dispose();
  }

  handleResize();

  return { renderer, scene, camera, handleResize, dispose };
}
