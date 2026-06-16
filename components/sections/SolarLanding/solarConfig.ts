/** Tunable constants for the solar-system landing page. */

/**
 * Tilt of the whole orbit plane (radians).
 * Zero — planets are scattered at random angles in the XZ plane with individual Y offsets.
 */
export const TILT = 0;

/** Scroll timeline units: transition duration and rest/hold at each section. */
export const TRANSITION = 1.2;
export const HOLD = 0.5;

/**
 * How far ahead the camera looks toward the next planet (0–1 blend).
 * Shifts the active planet left of frame, reveals the next planet on the right.
 */
export const LOOK_AHEAD = 0.12;

/** Scroll height per section (vh). More scroll per section = smoother transitions. */
export const SCROLL_VH_PER_SECTION = 140;

/**
 * Direction offset from the lookAt target to compute eye-level camera position.
 * Mostly behind (-X), slightly above (+Y), slightly to the right (+Z).
 * Normalised in the scene class.
 */
export const CAM_DIR: [number, number, number] = [-1, 0.2, 0.5];

/** Camera field of view. */
export const CAMERA_FOV = 55;

/** Hero camera — bird's-eye view from above, looking down at the star. */
export const HERO_CAM_POS: [number, number, number] = [0, 90, 0];
// We look slightly off-center along Z so the sun appears higher on the screen, avoiding the center text
export const HERO_CAM_LOOK: [number, number, number] = [0, 0, 15];

/**
 * Sway amplitude during planet-to-planet transitions.
 * The camera sways right (+Z), then left (-Z), then settles at center (0).
 */
export const SWAY_AMPLITUDE = 12.0;

/** Where the planet textures live under /public. */
export const TEXTURE_PATH = "/textures/planets/";

/** Renderer / grade. */
export const TONE_EXPOSURE = 1.1;

/** Very low fog density so planets at wide orbits remain visible. */
export const FOG_DENSITY = 0.0012;

/** Bloom (UnrealBloomPass). */
export const BLOOM = {
  strength: 0.85,
  mobileStrength: 0.55,
  radius: 0.5,
  threshold: 0.6,
};

/** Blue star core + key light. Slightly larger and brighter for the wide system. */
export const STAR = {
  radius: 2.4,
  lightColor: 0x4d8bff,
  lightIntensity: 380,
};

/** Soft fill so dark sides are never pure black. */
export const ENV_MAP_INTENSITY = 0.55;
export const AMBIENT = { color: 0x1a2a44, intensity: 0.3 };

/** Star field particle counts. */
export const STARS = { desktop: 3000, mobile: 900 };

/**
 * Camera rest distance from a planet of radius r.
 * Close enough for the first-person "in-orbit" feel.
 */
export const restDistance = (radius: number) => radius * 3.5 + 1.0;

/** Orbit rings hidden — they don't make sense for a scattered layout. */
export const ORBIT_RING_OPACITY = 0;

/* ─────────────────────────────────────────────── */
/*  Add-on orbiter config                          */
/* ─────────────────────────────────────────────── */

export interface AddonConfig {
  kind: "holoPlane" | "techRing" | "particle" | "gear" | "dashedRing";
  count: number;
  orbitRadius: [number, number]; // [min, max]
  tilt: [number, number]; // [min, max] radians
}

/* ─────────────────────────────────────────────── */
/*  Planet data                                    */
/* ─────────────────────────────────────────────── */

export interface SolarPlanet {
  /** Display name. */
  name: string;
  /** Kicker label above the title. */
  kicker: string;
  /** Section heading. */
  title: string;
  /** Section body text. */
  description: string;
  /** Planet mesh radius. */
  radius: number;
  /** Distance from the star (orbit radius). */
  orbit: number;
  /** Angle on the orbit (radians). Random spread around the star. */
  angle: number;
  /** Vertical offset from the orbital plane — adds 3D depth. */
  yOffset: number;
  /** Texture file under TEXTURE_PATH. */
  texture: string;
  /** Tint multiplied over the texture. */
  tint: number;
  /** Accent colour for the holographic add-ons (hex integer). */
  accentColor: number;
  /** Whether this planet has a planetary ring system (e.g. Saturn). */
  hasRings?: boolean;
  /** What orbiter types float around this planet. */
  addons: AddonConfig[];
}

/**
 * Five fictional planets scattered at random angles around the star.
 * Wide spacing so the "next planet" is a small distant dot.
 * Each has unique holographic add-on orbiters.
 */
export const PLANETS: SolarPlanet[] = [
  {
    name: "Aethon",
    kicker: "Orbit 01 — Aethon",
    title: "The Awakening",
    description:
      "Where ideas ignite. Every journey starts with a single spark — the moment raw curiosity meets unbounded ambition.",
    radius: 1.4,
    orbit: 12,
    angle: -1.8,
    yOffset: 0,
    texture: "4k_eris_fictional.jpg",
    tint: 0x8fa6c8,
    accentColor: 0x6fd9ff,
    addons: [
      { kind: "holoPlane", count: 4, orbitRadius: [2.2, 3.0], tilt: [0.15, 0.35] },
      { kind: "techRing", count: 2, orbitRadius: [2.4, 2.8], tilt: [0.25, 0.4] },
      { kind: "dashedRing", count: 1, orbitRadius: [3.1, 3.3], tilt: [0.3, 0.5] },
    ],
  },
  {
    name: "Veylith",
    kicker: "Orbit 02 — Veylith",
    title: "The Forge",
    description:
      "Tempered by iteration. We shape concepts through relentless craft until they crystallize into something extraordinary.",
    radius: 1.7,
    orbit: 28,
    angle: 0.7,
    yOffset: 2,
    texture: "4k_ceres_fictional.jpg",
    tint: 0xc89372,
    accentColor: 0xffc96b,
    addons: [
      { kind: "holoPlane", count: 8, orbitRadius: [2.2, 3.6], tilt: [0.15, 0.55] },
      { kind: "techRing", count: 3, orbitRadius: [2.5, 3.2], tilt: [0.2, 0.5] },
      { kind: "particle", count: 20, orbitRadius: [1.8, 4.2], tilt: [0.1, 0.65] },
    ],
  },
  {
    name: "Thalara",
    kicker: "Orbit 03 — Thalara",
    title: "The Current",
    description:
      "Design in motion. Systems that breathe, adapt, and flow — alive with purpose at every scale.",
    radius: 1.2,
    orbit: 45,
    angle: -0.4,
    yOffset: -1.5,
    texture: "4k_haumea_fictional.jpg",
    tint: 0x7fc4b6,
    accentColor: 0x5cf2a6,
    addons: [
      { kind: "holoPlane", count: 5, orbitRadius: [2.6, 3.2], tilt: [0.25, 0.45] },
      { kind: "techRing", count: 2, orbitRadius: [2.4, 2.9], tilt: [0.35, 0.5] },
      { kind: "particle", count: 14, orbitRadius: [2.2, 3.8], tilt: [0.15, 0.55] },
    ],
  },
  {
    name: "Novaryn",
    kicker: "Orbit 04 — Novaryn",
    title: "The Expanse",
    description:
      "Scaling outward. From a single point of light to a constellation — building systems that endure.",
    radius: 1.6,
    orbit: 65,
    angle: 1.6,
    yOffset: 3,
    texture: "4k_makemake_fictional.jpg",
    tint: 0xa890c8,
    accentColor: 0xbb97ff,
    addons: [
      { kind: "gear", count: 2, orbitRadius: [2.0, 2.6], tilt: [0.1, 0.3] },
      { kind: "dashedRing", count: 2, orbitRadius: [2.7, 3.0], tilt: [0.2, 0.4] },
      { kind: "particle", count: 10, orbitRadius: [1.8, 3.2], tilt: [0.0, 0.6] },
    ],
  },
  {
    name: "Saturn",
    kicker: "Orbit 05 — Saturn",
    title: "The Arrival",
    description:
      "You've reached the edge of the map. What we build next is uncharted. Let's make contact.",
    radius: 1.8,
    orbit: 90,
    angle: -1.2,
    yOffset: -2,
    texture: "8k_saturn.jpg",
    hasRings: true,
    tint: 0xffffff, // Saturn already has its own strong color
    accentColor: 0xffe28b,
    addons: [
      { kind: "holoPlane", count: 5, orbitRadius: [1.8, 2.5], tilt: [0.3, 0.6] },
      { kind: "dashedRing", count: 2, orbitRadius: [2.2, 2.8], tilt: [0.4, 0.5] },
      { kind: "gear", count: 1, orbitRadius: [2.0, 2.2], tilt: [0.2, 0.7] },
    ],
  },
];
