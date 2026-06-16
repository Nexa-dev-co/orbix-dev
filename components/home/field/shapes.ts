import * as THREE from "three";
import { AMBIENT_PULL, GAP, SHAPE_FRACTION, SHAPE_W } from "./config";

/**
 * Builds the target textures the simulation pulls particles toward — one per
 * destination of the Orbix universe, packed as xyz = home position,
 * w = pull strength (AMBIENT_PULL for free drifters).
 *
 *   0 wordmark  — "orbix" rasterized from the display font
 *   1 orbits    — four tilted service rings around a small core
 *   2 planets   — four small worlds on a lane (plus one big variant per
 *                 project for the hover formation)
 *   3 streams   — concentric elongated data loops that circulate while parked
 *   4 core      — a dense core inside a docking ring
 *
 * Particle index → role is fixed across formations: the first 70% belong to
 * whatever shape is active, the rest fill the corridor between destinations.
 */

const RASTER_W = 1200;
const RASTER_H = 600;
const WORLD_H = SHAPE_W * (RASTER_H / RASTER_W);

export interface FieldTargets {
  stops: THREE.DataTexture[];
  /** one fully-formed planet per project — shown while hovering its row */
  planets: THREE.DataTexture[];
}

/** A formation is a generator: particle index + slot count → home position. */
type Formation = (i: number, n: number, out: THREE.Vector3) => void;

export async function buildTargets(simSize: number): Promise<FieldTargets> {
  const word = await rasterWordmark();

  const stops = [
    makeTexture(simSize, word, 0),
    makeTexture(simSize, orbitsFormation(), -GAP),
    makeTexture(simSize, planetLane(), -GAP * 2),
    makeTexture(simSize, streamsFormation(), -GAP * 3),
    makeTexture(simSize, coreFormation(), -GAP * 4),
  ];

  const planets = [
    planetVariant(5.8, "ring"),
    planetVariant(4.4, "moons"),
    planetVariant(6.6, "double-ring"),
    planetVariant(3.8, "halo"),
  ].map((f) => makeTexture(simSize, f, -GAP * 2));

  return { stops, planets };
}

/* ── wordmark (the only rasterized formation) ──────────── */

async function rasterWordmark(): Promise<Formation> {
  const canvas = document.createElement("canvas");
  canvas.width = RASTER_W;
  canvas.height = RASTER_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // next/font mangles the family name — read it off the CSS variable
  const family =
    getComputedStyle(document.documentElement).getPropertyValue("--font-syne").trim() ||
    "sans-serif";
  try {
    await document.fonts.load(`800 100px ${family}`);
  } catch {
    /* canvas falls back */
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  let px = 420;
  ctx.font = `800 ${px}px ${family}`;
  const w = ctx.measureText("orbix").width;
  px = Math.min(px * ((RASTER_W * 0.94) / Math.max(w, 1)), RASTER_H * 0.82);
  ctx.font = `800 ${px}px ${family}`;
  ctx.fillText("orbix", RASTER_W / 2, RASTER_H / 2);

  const img = ctx.getImageData(0, 0, RASTER_W, RASTER_H).data;
  const pts: number[] = [];
  for (let y = 0; y < RASTER_H; y += 2) {
    for (let x = 0; x < RASTER_W; x += 2) {
      if (img[(y * RASTER_W + x) * 4 + 3] > 120) {
        pts.push((x / RASTER_W - 0.5) * SHAPE_W, (0.5 - y / RASTER_H) * WORLD_H);
      }
    }
  }
  const nPts = pts.length / 2;
  shuffle(pts, nPts);

  return (i, _n, out) => {
    const p = i % nPts;
    out.set(
      pts[p * 2] + rnd(0.3),
      pts[p * 2 + 1] + rnd(0.3),
      rnd(1.4)
    );
  };
}

/* ── procedural formations ─────────────────────────────── */

/** Four tilted service rings around a small engineering core. */
function orbitsFormation(): Formation {
  const radii = [7, 11, 15, 19];
  const axis = new THREE.Vector3(1, 0, 0);
  return (i, n, out) => {
    if (i < n * 0.1) {
      // the core at the centre of the ecosystem
      out.set(gauss(1.4), gauss(1.4), gauss(1.4));
      return;
    }
    const ring = i % 4;
    const t = Math.random() * Math.PI * 2;
    out.set(Math.cos(t) * radii[ring], Math.sin(t) * radii[ring], rnd(0.7));
    out.applyAxisAngle(axis, 1.1 + ring * 0.07);
    out.x += rnd(0.4);
    out.y += rnd(0.4);
  };
}

/** Four small worlds resting on a shared lane — the project index. */
function planetLane(): Formation {
  const xs = [-16.5, -5.5, 5.5, 16.5];
  const ys = [2.2, -1.6, 1.2, -2.4];
  return (i, _n, out) => {
    const p = i % 4;
    spherePoint(2.4, out);
    out.x += xs[p];
    out.y += ys[p];
  };
}

/** One fully-formed world per project, each with its own signature feature. */
function planetVariant(radius: number, feature: "ring" | "moons" | "double-ring" | "halo"): Formation {
  return (i, n, out) => {
    if (i < n * 0.78) {
      spherePoint(radius, out);
      return;
    }
    if (feature === "ring" || feature === "double-ring") {
      const r = feature === "double-ring" && i % 2 === 0 ? radius * 1.9 : radius * 1.55;
      const t = Math.random() * Math.PI * 2;
      out.set(Math.cos(t) * r, Math.sin(t) * r * 0.28, rnd(0.4));
      out.applyAxisAngle(X_AXIS, 0.45);
    } else if (feature === "moons") {
      const m = i % 2;
      spherePoint(0.9, out);
      out.x += m === 0 ? radius + 4.2 : -(radius + 3);
      out.y += m === 0 ? 2.4 : -3.2;
    } else {
      // halo: a sparse shell of debris
      spherePoint(radius + 2.5 + Math.random() * 3, out);
    }
  };
}

/** Concentric elongated loops — the data streams the process flows along. */
function streamsFormation(): Formation {
  const a = [10, 14, 18, 22];
  const b = [3.5, 5, 6.5, 8];
  return (i, _n, out) => {
    const s = i % 4;
    const t = Math.random() * Math.PI * 2;
    out.set(
      Math.cos(t) * a[s] + rnd(0.5),
      Math.sin(t) * b[s] + rnd(0.5),
      rnd(1.6)
    );
  };
}

/** The core: a dense engine inside a docking ring. */
function coreFormation(): Formation {
  return (i, n, out) => {
    if (i < n * 0.75) {
      out.set(gauss(2.2), gauss(2.2), gauss(2.2));
      return;
    }
    const t = Math.random() * Math.PI * 2;
    out.set(Math.cos(t) * 8, Math.sin(t) * 8, rnd(0.6));
  };
}

/* ── packing ───────────────────────────────────────────── */

function makeTexture(simSize: number, formation: Formation, z: number): THREE.DataTexture {
  const count = simSize * simSize;
  const shapeCount = Math.floor(count * SHAPE_FRACTION);
  const data = new Float32Array(count * 4);
  const v = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const o = i * 4;
    if (i < shapeCount) {
      formation(i, shapeCount, v);
      data[o] = v.x;
      data[o + 1] = v.y;
      data[o + 2] = v.z + z;
      data[o + 3] = 1;
    } else {
      data[o] = rnd(SHAPE_W * 1.5);
      data[o + 1] = rnd(WORLD_H * 1.6);
      data[o + 2] = z + rnd(48);
      data[o + 3] = AMBIENT_PULL;
    }
  }

  const tex = new THREE.DataTexture(data, simSize, simSize, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/* ── helpers ───────────────────────────────────────────── */

const X_AXIS = new THREE.Vector3(1, 0, 0);

/** centred random in [-s/2, s/2] */
function rnd(s: number) {
  return (Math.random() - 0.5) * s;
}

/** cheap gaussian-ish */
function gauss(s: number) {
  return (Math.random() + Math.random() + Math.random() - 1.5) * s;
}

/** uniform point on a sphere shell of the given radius */
function spherePoint(radius: number, out: THREE.Vector3) {
  const th = Math.random() * Math.PI * 2;
  const ph = Math.acos(2 * Math.random() - 1);
  const r = radius * (1 + rnd(0.06));
  out.set(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
}

/** Fisher–Yates over xy pairs so consecutive indices don't sit on adjacent pixels */
function shuffle(pts: number[], n: number) {
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const xi = pts[i * 2], yi = pts[i * 2 + 1];
    pts[i * 2] = pts[j * 2];
    pts[i * 2 + 1] = pts[j * 2 + 1];
    pts[j * 2] = xi;
    pts[j * 2 + 1] = yi;
  }
}
