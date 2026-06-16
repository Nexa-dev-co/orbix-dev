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

/** Fraction of particles that belong to the formation; the rest drift free. */
export const SHAPE_FRACTION = 0.7;

/** Home-pull strength for free (non-formation) particles. */
export const AMBIENT_PULL = 0.12;

/** How long the press-and-hold takes to reach full collapse. */
export const HOLD_RAMP = 1.15;
