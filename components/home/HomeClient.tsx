"use client";

import dynamic from "next/dynamic";

// The field is WebGL — load client-only so `three` stays out of the server graph
// (a three import in the server build trips a Next 14 parallel-build race on Windows).
const OrbixHome = dynamic(() => import("@/components/home/field"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "var(--bg)" }} />,
});

export default function HomeClient() {
  return <OrbixHome />;
}
