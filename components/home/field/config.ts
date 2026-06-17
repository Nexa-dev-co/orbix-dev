/** Tunable constants for the homepage field — the particle Orbix universe. */

/** Simulation texture side — particle count is SIM_SIZE². */
export const SIM_SIZE = { desktop: 512, mobile: 256 };

/** Z distance between consecutive destinations (world units). */
export const GAP = 60;

/** Base camera distance from the destination it is parked on. */
export const CAM_DIST = 42;
export const FOV = 50;

/** World width the wordmark raster maps onto (height = half, raster is 2:1). */
export const SHAPE_W = 64;

/** Vertical offset (world units) lifting the wordmark above centre for breathing room. */
export const WORDMARK_LIFT = 3.5;

/**
 * Camera attitude at each destination (spherical around the focus point).
 * `az`/`el` in radians, `dist` multiplies CAM_DIST. The journey interpolates
 * between consecutive entries while travelling.
 */
export const CAMERA_STOPS = [
  { az: 0, el: 0, dist: 1 }, // wordmark — frontal
  { az: 0, el: 0.5, dist: 1.05 }, // orbits — looking down on the rings
  { az: 0.25, el: 0.12, dist: 0.92 }, // planets — three-quarter view
  { az: -0.15, el: 0.06, dist: 1 }, // streams — frontal-ish, banked arrival
  { az: 0, el: 0.04, dist: 0.6 }, // core — docked in close
];

/**
 * One entry per travel leg. Each leg is a different manoeuvre (transition
 * identity, per docs/TRANSITION_PHILOSOPHY.md) and they escalate (Rule 3):
 *   1 gravitational pull · 2 planet formation · 3 stream navigation · 4 docking
 * `mode` feeds the velocity shader; the rest shapes the camera move.
 */
export const SEGMENTS = [
  { mode: 1, duration: 0.9, azSwing: 0.1, dip: 0.22, roll: 0.03 },
  { mode: 2, duration: 1.1, azSwing: 0.55, dip: 0.4, roll: 0.05 },
  { mode: 3, duration: 1.3, azSwing: -0.28, dip: 0.3, roll: -0.09 },
  { mode: 4, duration: 1.5, azSwing: 0.15, dip: 0.12, roll: 0.04 },
];

/**
 * Showpiece variants for the final leg (streams → core). This transition is the
 * journey's climax and ignores the generic SEGMENTS manoeuvre; three distinct
 * languages are built so they can be compared live. Pick without code changes:
 *   ?transition=braid | crystal | warp   (or 1|2|3, or random)
 *
 *   braid   — the four data streams weave into one luminous thread that winds
 *             into the core (camera spirals along the braid)
 *   crystal — flowing signal snaps onto a faceted crystal lattice; the core is
 *             a hard angular gem, not a soft blob (camera orbits the facets)
 *   warp    — the streams stretch into a tunnel the camera flies through and
 *             punches a membrane to arrive in the core chamber
 */
export const CORE_TRANSITIONS = ["braid", "crystal", "warp"] as const;
export type CoreTransition = (typeof CORE_TRANSITIONS)[number];
export const DEFAULT_CORE_TRANSITION: CoreTransition = "crystal";

/** Velocity-shader id per variant (uCoreMode); 0 = no core showpiece active. */
export const CORE_MODE: Record<CoreTransition, number> = {
  braid: 1,
  crystal: 2,
  warp: 3,
};

/**
 * Resolve the active variant from the URL: `?transition=braid|crystal|warp`, a
 * 1-based index (`1|2|3`), or `random`. Falls back to DEFAULT_CORE_TRANSITION.
 */
export function resolveCoreTransition(): CoreTransition {
  if (typeof window === "undefined") return DEFAULT_CORE_TRANSITION;
  const raw = new URLSearchParams(window.location.search)
    .get("transition")
    ?.trim()
    .toLowerCase();
  if (!raw) return DEFAULT_CORE_TRANSITION;
  if (raw === "random")
    return CORE_TRANSITIONS[
      Math.floor(Math.random() * CORE_TRANSITIONS.length)
    ];
  const byIndex = CORE_TRANSITIONS[Number(raw) - 1];
  if (byIndex) return byIndex;
  return (CORE_TRANSITIONS as readonly string[]).includes(raw)
    ? (raw as CoreTransition)
    : DEFAULT_CORE_TRANSITION;
}

/**
 * Per-variant camera language for the final leg. Distances multiply the leg's
 * CAMERA_STOPS entries; angles are radians; keyframes/widths are in leg-progress
 * p (0..1). Force magnitudes themselves live in the velocity shader (glsl.ts).
 */
export const BRAID_CAM = { sweep: 1.4, lift: 0.16, bank: 0.25 }; // spiral arc around the thread
export const BRAID_SIM = { coilFrom: 0.78, coilTo: 1.0 }; // p-range the thread coils into the core
// crystallization: hold back, turn to reveal the facets, then snap-lock with a
// refraction glint. `turn` is a one-way reveal that lands and holds (not a sweep
// back); `recoil` is a brief dolly dip at the lock that sells the "click".
export const CRYSTAL_CAM = { turn: 0.5, lift: 0.14, pullBack: 1.22, lockP: 0.72, recoil: 0.08 };
export const CRYSTAL_SIM = {
  from: 0.1,
  to: 0.7,
  lockAt: 0.72,
  lockWidth: 0.06,
  noise: 0.22,
  glintFrom: 0.66, // a bright band sweeps across the facets as the lattice locks
  glintTo: 0.88,
};
export const WARP_CAM = { through: 0.34, tilt: 0.18, fovKick: 22 }; // forward rush + fov punch
export const WARP_SIM = {
  from: 0.08,
  to: 0.65,
  punchAt: 0.72,
  punchWidth: 0.05,
};

/** Scroll timeline units: hold length on each destination. */
export const HOLD = 0.55;
export const HERO_HOLD = 0.7;

/** Intro: time the field takes to bloom from the seed point into the wordmark. */
export const INTRO_DURATION = 2.4;

/** Last-resort reveal if the loader never hands off (ms). */
export const REVEAL_FALLBACK_MS = 9000;

/** Mouse parallax (world units of camera drift) + camera roll. */
export const PARALLAX = { x: 4.2, y: 2.6, lerp: 0.05, roll: 0.02 };

/** Point sprite look. */
export const POINT = { size: 2.1, opacity: 0.85, mobileSize: 2.6 };

export const COLORS = {
  bg: 0x060606,
  fg: 0xebe8e0,
  accent: 0xff3d1f,
};

/**
 * Fraction of particles that belong to the formation; the rest drift free as the
 * ambient starfield. Raised to thin that starfield — the surplus goes into the
 * formation, where additive saturation hides it, so the wordmark reads unchanged.
 */
export const SHAPE_FRACTION = 0.98;

/** Home-pull strength for free (non-formation) particles. */
export const AMBIENT_PULL = 0.12;

/**
 * Layout of the four rest-lane planets (the project index). Shared by the
 * formation (shapes.ts) and the renderer's per-planet sphere shading
 * (FieldScene → glsl uLaneCenters), so both agree on where each world sits.
 */
export const PLANET_LANE = {
  radii: [3.3, 2.6, 3.7, 2.4],
  xs: [-18, -6, 6, 18],
  ys: [2, -1, 1, -2],
  zs: [0, 4.5, -4.5, 2],
};

/**
 * World-x the hovered planet gathers to. Shifting it onto the right half clears
 * the project list on the left, so the planet reads cleanly over the dark.
 */
export const PLANET_HOVER_X = 15;

/**
 * Hovered planet's name, spelled in particles floating above the sphere (over
 * dark space so it reads), tinted accent at render. Sits above the planet rather
 * than across it — particles over the bright sphere are illegible.
 *   band     — fraction of the planet's particles given to the name
 *   height   — name glyph height as a fraction of the planet radius
 *   maxWidth — cap the name width at this × radius (long names shrink to fit)
 *   top      — world-units gap between the sphere top and the name block
 *   front    — name's forward (z) offset as a fraction of radius, so it clears
 *              the ring and reads in front
 */
export const PLANET_LABEL = { band: 0.22, height: 0.5, maxWidth: 2.4, top: 2.0, front: 0.4 };

/** How long the press-and-hold takes to reach full collapse. */
export const HOLD_RAMP = 1.15;
