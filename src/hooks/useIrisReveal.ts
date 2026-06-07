import { useCallback, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap-config";

const REVEAL_DURATION_SECONDS = 1.6;
// uAccentPulse ramps up over the first 30% of the reveal, then decays — the
// cyan glow blooms as the iris opens and is gone by the time it clears frame.
const ACCENT_PULSE_PEAK_FRACTION = 0.3;

interface IrisContext {
  handleResize: () => void;
  dispose: () => void;
}

export interface IrisRevealApi {
  /**
   * Paints the canvas opaque black, invokes `onCovered` once that black frame
   * is on screen (so callers can drop the overlay background underneath without
   * a flash), then animates the iris open and resolves when fully revealed.
   */
  runReveal: (onCovered?: () => void) => Promise<void>;
}

/*
  Lifecycle for the WebGL iris reveal. Three.js is imported dynamically so it
  only loads in the browser (never during SSR) and stays out of the initial
  bundle. The hook keeps the GPU context in a ref so it can be disposed on
  unmount, and drives the shader uniforms with a GSAP timeline.
*/
export function useIrisReveal(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
): IrisRevealApi {
  const irisContextRef = useRef<IrisContext | null>(null);

  useEffect(() => {
    const handleWindowResize = () => irisContextRef.current?.handleResize();
    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      irisContextRef.current?.dispose();
      irisContextRef.current = null;
    };
  }, []);

  const runReveal = useCallback<IrisRevealApi["runReveal"]>(
    async (onCovered) => {
      const canvas = canvasRef.current;
      // Already built (reveal can only run once) or canvas not mounted — bail.
      if (!canvas || irisContextRef.current) {
        return;
      }

      const THREE = await import("three");
      const { createThreeContext } = await import("@/lib/three-setup");
      const { irisVertexShader, irisFragmentShader } = await import(
        "@/components/loading/iris-shader"
      );

      const { renderer, scene, camera, handleResize, dispose } =
        createThreeContext({ canvas });

      const uniforms = {
        uLoaded: { value: 0 },
        uAccentPulse: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
        },
      };

      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        vertexShader: irisVertexShader,
        fragmentShader: irisFragmentShader,
        uniforms,
        transparent: true,
        depthTest: false,
      });
      const fullScreenQuad = new THREE.Mesh(geometry, material);
      scene.add(fullScreenQuad);

      // Keep uResolution in sync with the canvas so the iris stays circular.
      const handleResizeAll = () => {
        handleResize();
        uniforms.uResolution.value.set(canvas.clientWidth, canvas.clientHeight);
      };

      irisContextRef.current = {
        handleResize: handleResizeAll,
        dispose: () => {
          renderer.setAnimationLoop(null);
          geometry.dispose();
          material.dispose();
          dispose();
        },
      };

      renderer.setAnimationLoop(() => renderer.render(scene, camera));

      // 1. Paint one opaque-black frame, then wait a frame so it's actually on
      //    screen before telling the caller to remove the backdrop beneath us.
      await new Promise<void>((resolveCovered) => {
        requestAnimationFrame(() => {
          onCovered?.();
          resolveCovered();
        });
      });

      // 2. Animate the iris open. uLoaded drives the radius; uAccentPulse blooms
      //    then fades for the cyan glow.
      await new Promise<void>((resolveReveal) => {
        const pulsePeakTime = REVEAL_DURATION_SECONDS * ACCENT_PULSE_PEAK_FRACTION;
        const timeline = gsap.timeline({
          onComplete: () => resolveReveal(),
        });
        timeline.to(
          uniforms.uLoaded,
          { value: 1, duration: REVEAL_DURATION_SECONDS, ease: "power2.inOut" },
          0
        );
        timeline.to(
          uniforms.uAccentPulse,
          { value: 1, duration: pulsePeakTime, ease: "power2.out" },
          0
        );
        timeline.to(
          uniforms.uAccentPulse,
          {
            value: 0,
            duration: REVEAL_DURATION_SECONDS - pulsePeakTime,
            ease: "power2.in",
          },
          pulsePeakTime
        );
      });

      // 3. Reveal done — stop rendering (canvas is fully transparent now).
      renderer.setAnimationLoop(null);
    },
    [canvasRef]
  );

  return { runReveal };
}
