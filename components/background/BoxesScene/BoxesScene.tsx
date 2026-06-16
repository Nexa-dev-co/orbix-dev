"use client";

import Spline from "@splinetool/react-spline";

// Spline runtime scene — carries the designed lighting, camera and the built-in
// hover interactions (unlike a GLB, which is geometry + materials only).
const SCENE_URL =
  "https://prod.spline.design/HxuyZ0sVjLbYo7hX/scene.splinecode";

/**
 * Spline-runtime backdrop: renders the scene exactly as designed (lights,
 * camera, hover behaviour) behind the page content. Fills the field; the dark
 * bg shows until the scene loads.
 */
export default function BoxesScene() {
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, background: "var(--bg)" }}
    >
      <Spline scene={SCENE_URL} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
