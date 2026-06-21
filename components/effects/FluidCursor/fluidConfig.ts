// Tuning for the fluid cursor. Every value here exists to kill one of the
// problems past trail attempts had: long tails, hard heads, and banding.
// The two big anti-tail levers are the dissipation values + low curl.

export interface FluidConfig {
  /** Resolution of the velocity/pressure simulation grid. 128 is plenty for a cursor blob. */
  simulationResolution: number;
  /** Resolution of the dye (the visible ink) field. */
  dyeResolution: number;
  /** How fast the dye fades. High → the ink never lingers, so there is no tail. */
  densityDissipation: number;
  /** How fast momentum dies. High → the fluid settles under the cursor instead of shooting off. */
  velocityDissipation: number;
  /** Pressure projection strength (keeps the fluid incompressible). */
  pressure: number;
  /** Jacobi iterations for the pressure solve. */
  pressureIterations: number;
  /** Vorticity confinement. Low → no wispy filaments curling off into a tail. */
  curl: number;
  /** How hard a pointer move pushes the fluid. */
  splatForce: number;
}

export const FLUID_CONFIG: FluidConfig = {
  simulationResolution: 128,
  dyeResolution: 1024,
  densityDissipation: 3.2, // dye fades fast → no lingering tail   (reference default: 1)
  velocityDissipation: 3.0, // momentum dies fast → blob stays on cursor (reference: 0.2)
  pressure: 0.8,
  pressureIterations: 20,
  curl: 4, // low vorticity → no wispy filaments      (reference: 30)
  splatForce: 1600, // gentle push, not a jet                 (reference: 6000)
};

// ── Blob size, mapped from cursor speed ────────────────────────────────
// A compact blob at rest, growing toward the max only when the cursor is whipped.
export const MIN_BLOB_RADIUS_PX = 15;
export const MAX_BLOB_RADIUS_PX = 30;
// Normalized pointer speed (screen-heights per second) at which the blob hits its max radius.
export const SPEED_FOR_MAX_RADIUS = 2.2;

// ── Ink appearance ─────────────────────────────────────────────────────
// Near-black, with the faintest cool tint so it reads as "deep space" not flat grey.
export const INK_COLOR: readonly [number, number, number] = [0.02, 0.02, 0.03];
// Peak opacity of the visible ink veil. Deliberately below 1 so the inverted
// text on the layer beneath can glow through (the backlit-in-dark-water look).
export const INK_PEAK_ALPHA = 0.82;
// How strongly accumulated dye maps to visible presence. Higher → blob fills in faster.
export const DYE_TO_PRESENCE = 4.0;
// Amount of dye injected per pointer move (drives how solid the blob gets).
export const DYE_SPLAT_AMOUNT = 0.3;

// ── Stars (the only "lighting", kept subtle) ───────────────────────────
export const STAR_CELL_SIZE_PX = 46; // grid cell that may contain one star
export const STAR_FILL_RATIO = 0.55; // fraction of cells that actually hold a star
export const STAR_BRIGHTNESS = 0.85;
export const STAR_TWINKLE_SPEED = 1.6;
// Each star randomly picks one of these two: white and a deep cool blue.
export const STAR_PALETTE: readonly (readonly [number, number, number])[] = [
  [1.0, 1.0, 1.0], // white
  [0.2, 0.4, 1.0], // dark blue
];
