/**
 * The dive itinerary: every stop on the descent from the establishing shot to
 * the core, plus the content each one shows. Order = dive order (outermost
 * orbit first, core last).
 */

export type StopKind = "overview" | "statement" | "work" | "process" | "core";

export interface PlanetSpec {
  /** planet radius */
  radius: number;
  /** orbit radius from the sun */
  orbit: number;
  /** starting angle on the orbit (radians) */
  angle: number;
  /** orbital angular speed (radians / second) — inner orbits run faster */
  speed: number;
  /** texture file under TEXTURE_PATH */
  texture: string;
  /** tint multiplied over the (grey) texture → palette */
  tint: number;
}

export interface DiveStop {
  nav: string;
  kicker: string;
  title: string;
  kind: StopKind;
  /** bottom-left HUD readout while parked at this stop */
  telemetry: string;
  /** overview + core focus the origin; orbit stops focus a live planet */
  planet?: PlanetSpec;
}

export const STOPS: DiveStop[] = [
  {
    nav: "System",
    kicker: "System online — all orbits nominal",
    title: "orbix",
    kind: "overview",
    telemetry: "FULL SYSTEM · 5 BODIES TRACKED · HOLDING",
  },
  {
    nav: "Statement",
    kicker: "Orbit 01 — The statement",
    title: "Software with gravity.",
    kind: "statement",
    telemetry: "ORBIT 01 · STATEMENT · R 9.6 · DESCENT NOMINAL",
    planet: { radius: 1.0, orbit: 9.6, angle: -1.25, speed: 0.018, texture: "2k_eris_fictional.jpg", tint: 0x8fa6c8 },
  },
  {
    nav: "Work",
    kicker: "Orbit 02 — Mission log",
    title: "Missions on record.",
    kind: "work",
    telemetry: "ORBIT 02 · WORK · R 7.2 · DESCENT NOMINAL",
    planet: { radius: 1.12, orbit: 7.2, angle: 0.95, speed: 0.03, texture: "2k_ceres_fictional.jpg", tint: 0xc89372 },
  },
  {
    nav: "Process",
    kicker: "Orbit 03 — Descent protocol",
    title: "How we navigate.",
    kind: "process",
    telemetry: "ORBIT 03 · PROCESS · R 5.0 · DESCENT NOMINAL",
    planet: { radius: 0.88, orbit: 5.0, angle: 2.75, speed: 0.045, texture: "2k_haumea_fictional.jpg", tint: 0x7fc4b6 },
  },
  {
    nav: "Core",
    kicker: "The core — Landing",
    title: "Make contact.",
    kind: "core",
    telemetry: "CORE PROXIMITY · HEAT SHIELD NOMINAL · LANDED",
  },
];

/** Non-stop planets that keep the system feeling inhabited. */
export const AMBIENT_PLANETS: PlanetSpec[] = [
  { radius: 0.62, orbit: 11.6, angle: 3.9, speed: 0.012, texture: "2k_makemake_fictional.jpg", tint: 0xa890c8 },
  { radius: 0.4, orbit: 3.2, angle: 5.4, speed: 0.065, texture: "2k_moon.jpg", tint: 0xc88a66 },
];

/* ── Content ───────────────────────────────────────────── */

export const HERO = {
  sub: "A software company building products with their own gravity — systems people can't help but orbit.",
  cue: "Scroll to begin descent",
};

export const STATEMENT = {
  body: "A planet doesn't chase its moons. We engineer products the same way — built with enough pull that users simply stay. One team, the whole stack, no drag.",
  capabilities: [
    "Custom Web Applications",
    "SaaS Platforms",
    "Enterprise CRM",
    "Mobile Applications",
    "AI Solutions",
    "Product Design",
  ],
};

export const WORK = [
  { id: "MSN-026", title: "Nova Finance", category: "SaaS platform", year: "2026" },
  { id: "MSN-025", title: "Atlas Commerce", category: "Commerce engine", year: "2025" },
  { id: "MSN-024", title: "Solace", category: "Brand & product", year: "2025" },
  { id: "MSN-023", title: "Pulse", category: "AI campaign", year: "2024" },
];

export const PROCESS = [
  { n: "01", title: "Survey", desc: "Map the territory — strategy, story, and the physics of the whole system." },
  { n: "02", title: "Trajectory", desc: "Design the path — interface, motion and architecture plotted as one curve." },
  { n: "03", title: "Ignition", desc: "Build in tight loops — design and engineering burning in the same chamber." },
  { n: "04", title: "Stable orbit", desc: "Launch, measure, and keep the system accelerating after it's live." },
];

export const CORE = {
  body: "Every system starts with a single signal. Send yours.",
  email: "hello@orbix.studio",
  socials: [
    { label: "X / Twitter", href: "https://x.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "GitHub", href: "https://github.com" },
  ],
  attribution: "Planet textures: Solar System Scope · CC BY 4.0",
};
