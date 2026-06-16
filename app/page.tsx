"use client";

import dynamic from "next/dynamic";

// Three.js is WebGL — load client-only so `three` stays out of the server graph
const SolarLanding = dynamic(
  () => import("@/components/sections/SolarLanding/SolarLanding"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--bg)",
        }}
      />
    ),
  }
);

export default function Home() {
  return <SolarLanding />;
}
