/** Content + placement for each orbit/section, plus the mock data they show. */

export type SectionKind = "about" | "work" | "process" | "services" | "contact";

export interface OrbitSection {
  nav: string;
  kicker: string;
  title: string;
  kind: SectionKind;
  /** planet radius */
  radius: number;
  /** orbit radius from the sun */
  orbit: number;
  /** angle on the orbit (radians) */
  angle: number;
  /** texture file under TEXTURE_PATH */
  texture: string;
  /** tint multiplied over the (grey) texture → palette */
  tint: number;
}

export const SECTIONS: OrbitSection[] = [
  { nav: "About", kicker: "Orbit 01 — About", title: "We build worlds", kind: "about", radius: 0.85, orbit: 4.2, angle: -1.4, texture: "2k_eris_fictional.jpg", tint: 0x8fa6c8 },
  { nav: "Work", kicker: "Orbit 02 — Work", title: "Selected transmissions", kind: "work", radius: 1.05, orbit: 5.8, angle: 0.5, texture: "2k_ceres_fictional.jpg", tint: 0xc89372 },
  { nav: "Process", kicker: "Orbit 03 — Process", title: "How we navigate", kind: "process", radius: 0.8, orbit: 7.1, angle: 2.4, texture: "2k_haumea_fictional.jpg", tint: 0x7fc4b6 },
  { nav: "Services", kicker: "Orbit 04 — Services", title: "What we do", kind: "services", radius: 0.95, orbit: 8.5, angle: 4.0, texture: "2k_makemake_fictional.jpg", tint: 0xa890c8 },
  { nav: "Contact", kicker: "Orbit 05 — Landing", title: "Make contact", kind: "contact", radius: 0.9, orbit: 9.8, angle: 5.6, texture: "2k_moon.jpg", tint: 0xc88a66 },
];

export const WORK = [
  { title: "Nova Finance", category: "SaaS platform", year: "2026" },
  { title: "Atlas Commerce", category: "E-commerce", year: "2025" },
  { title: "Solace", category: "Brand & site", year: "2025" },
  { title: "Pulse", category: "Campaign", year: "2024" },
];

export const PROCESS = [
  { n: "01", title: "Plot", desc: "Strategy, story and the map of the whole journey." },
  { n: "02", title: "Build", desc: "Design and engineering in one tight, motion-led loop." },
  { n: "03", title: "Launch", desc: "Ship to live orbit — fast, polished, measured." },
];

export const SERVICES = ["Strategy", "Design", "Web Development", "Motion & 3D", "Brand systems"];
