/**
 * Content for every destination of the journey, in scroll order — structured
 * on the Orbix universe (docs/ORBIX_UNIVERSE.md): orbits are services,
 * planets are projects, data streams are the process, the core is contact.
 * Each destination has a matching particle formation in shapes.ts.
 */

export type StopKind = "hero" | "orbits" | "planets" | "streams" | "core";

export interface FieldStop {
  nav: string;
  kicker: string;
  title: string;
  kind: StopKind;
}

export const STOPS: FieldStop[] = [
  { nav: "System", kicker: "Independent software studio", title: "orbix", kind: "hero" },
  { nav: "Orbits", kicker: "01 — The orbits", title: "Four orbits. One core.", kind: "orbits" },
  { nav: "Planets", kicker: "02 — The planets", title: "Every project is a world.", kind: "planets" },
  { nav: "Streams", kicker: "03 — Data streams", title: "How signals become systems.", kind: "streams" },
  { nav: "Core", kicker: "04 — The core", title: "Dock with the core.", kind: "core" },
];

export const HERO = {
  sub: "A software company building products with their own gravity — systems people can't help but orbit.",
  cue: "Scroll to enter",
  hint: "Press & hold anywhere — the field obeys",
};

export const ORBITS = {
  body: "A planet doesn't chase its moons. We engineer products the same way — built with enough pull that users simply stay. Four specialized orbits, one engineering core.",
  rings: [
    { name: "Orbit Alpha", domain: "Web Experiences" },
    { name: "Orbit Beta", domain: "Mobile Systems" },
    { name: "Orbit Gamma", domain: "Enterprise Platforms" },
    { name: "Orbit Delta", domain: "Artificial Intelligence" },
  ],
};

export const PLANETS = [
  { title: "Nova Finance", orbit: "Orbit Gamma", year: "2026" },
  { title: "Atlas Commerce", orbit: "Orbit Alpha", year: "2025" },
  { title: "Solace", orbit: "Orbit Beta", year: "2025" },
  { title: "Pulse", orbit: "Orbit Delta", year: "2024" },
];

export const STREAMS = [
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
};
