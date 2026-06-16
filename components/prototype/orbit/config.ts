/** Tunable constants for the orbital-map prototype. */

/** Tilt of the whole orbit plane (radians). */
export const TILT = 0.95;

/** Scroll timeline units: length of a transition vs. the rest/hold on a section. */
export const TRANSITION = 1;
export const HOLD = 0.5;

/** Fixed camera viewing direction (offset from the focus point). Normalised in the scene. */
export const CAM_DIR: [number, number, number] = [0, 0.42, 1];

/** How far the camera pulls back mid-transition, per camera mode. */
export const DIP = { fly: 8, zoom: 24 } as const;
export type CameraMode = keyof typeof DIP;

/** Where the planet textures live under /public. */
export const TEXTURE_PATH = "/textures/planets/";

/** Renderer / grade. */
export const TONE_EXPOSURE = 1.05;
export const FOG_DENSITY = 0.008;

/** Bloom (UnrealBloomPass). */
export const BLOOM = { strength: 0.75, mobileStrength: 0.5, radius: 0.5, threshold: 0.7 };

/** Sun core + key light. */
export const SUN = { radius: 1.5, lightColor: 0xffe0b0, lightIntensity: 320 };

/** Soft fill so dark sides are never pure black. */
export const ENV_MAP_INTENSITY = 0.55;
export const AMBIENT = { color: 0x2a3344, intensity: 0.25 };

/** Star field counts. */
export const STARS = { desktop: 1800, mobile: 600 };

/** Camera rest distance from a planet of radius r. */
export const restDistance = (radius: number) => radius * 3 + 0.7;
