"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import OrbitMap from "@/components/prototype/OrbitMap";

// 3D version is WebGL — load client-only so `three` stays out of the server graph
const OrbitMap3D = dynamic(() => import("@/components/prototype/orbit"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "var(--bg)" }} />,
});

/**
 * Orbital-map navigation prototype. Default = 3D model; ?view=2d shows the 2D
 * SVG alternative. Camera modes: fly (default) / ?cam=zoom. Live homepage is
 * untouched. View at /prototype.
 */
export default function PrototypePage() {
  const [view, setView] = useState<"3d" | "2d">("3d");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "2d") setView("2d");
  }, []);

  return view === "2d" ? <OrbitMap /> : <OrbitMap3D />;
}
