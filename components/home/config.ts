/** Tunable constants for the homepage orbital dive. */

/** Tilt of the whole orbital plane (radians) — presents the system to camera. */
export const TILT = 0.95;

/** Scroll timeline units: travel length vs. the hold on each stop. */
export const TRANSITION = 1;
export const HOLD = 0.5;
/** Slightly longer hold on the establishing shot. */
export const HERO_HOLD = 0.65;

/** Fixed camera viewing direction (offset from the focus point). Normalised in the scene. */
export const CAM_DIR: [number, number, number] = [0, 0.42, 1];

/** Camera rest distance on the establishing overview / at the core. */
export const OVERVIEW_DIST = 26;
export const CORE_DIST = 5.4;

/** How far the camera pulls back mid-travel between orbits. */
export const DIP = 10;

/** Camera roll during travel (radians) — banks into the turn. */
export const ROLL = 0.055;

/** Intro: dist multiplier the camera starts at (near the core) before the
 *  loader hands off and it pulls back to the full system. */
export const INTRO_DIST_SCALE = 0.22;
export const INTRO_DURATION = 2.6;

/** Mouse-parallax strength (fraction of focus distance). */
export const PARALLAX = { x: 0.035, y: 0.022, lerp: 0.06 };

/** Where the planet textures live under /public. */
export const TEXTURE_PATH = "/textures/planets/";

/** Renderer / grade. */
export const TONE_EXPOSURE = 1.05;
export const FOG_DENSITY = 0.008;

/** Bloom (UnrealBloomPass). Strength is tweened down near the core for legibility. */
export const BLOOM = { strength: 0.75, mobileStrength: 0.5, radius: 0.5, threshold: 0.7, coreStrength: 0.5 };

/** Sun core + key light. */
export const SUN = { radius: 1.5, lightColor: 0xffe0b0, lightIntensity: 320 };

/** Soft fill so dark sides are never pure black. */
export const ENV_MAP_INTENSITY = 0.55;
export const AMBIENT = { color: 0x2a3344, intensity: 0.25 };

/** Star field counts. */
export const STARS = { desktop: 1800, mobile: 600 };

/** Orbit ring opacity — idle vs. the ring the camera is parked on. */
export const RING = { idle: 0.06, active: 0.2, lerp: 0.04 };

/** Camera rest distance from a planet of radius r. */
export const restDistance = (radius: number) => radius * 3 + 0.7;
