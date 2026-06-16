import * as THREE from "three";
import {
  AMBIENT_PULL,
  GAP,
  PLANET_HOVER_X,
  PLANET_LABEL,
  SHAPE_FRACTION,
  SHAPE_W,
  WORDMARK_LIFT,
  type CoreTransition,
} from "./config";
import { PLANETS } from "./content";

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

export async function buildTargets(
  simSize: number,
  transition: CoreTransition,
): Promise<FieldTargets> {
  const word = await rasterWordmark();

  // The crystal variant resolves the core as a hard faceted gem; braid/warp keep
  // the soft engine-core blob.
  const core = transition === "crystal" ? crystalFormation() : coreFormation();

  const stops = [
    makeTexture(simSize, word, 0),
    makeTexture(simSize, orbitsFormation(), -GAP),
    makeTexture(simSize, planetLane(), -GAP * 2),
    makeTexture(simSize, streamsFormation(), -GAP * 3),
    makeTexture(simSize, core, -GAP * 4),
  ];

  // One fully-formed planet per project, each carrying its name as a particle
  // label. The name raster is async (waits on the font), so build them together.
  const names = await Promise.all(PLANETS.map((project) => rasterText(project.title)));
  const planets = [
    planetVariant(5.8, "ring", names[0]),
    planetVariant(4.4, "moons", names[1]),
    planetVariant(6.6, "double-ring", names[2]),
    planetVariant(3.8, "halo", names[3]),
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
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-syne")
      .trim() || "sans-serif";
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
        pts.push(
          (x / RASTER_W - 0.5) * SHAPE_W,
          (0.5 - y / RASTER_H) * WORLD_H,
        );
      }
    }
  }
  const nPts = pts.length / 2;
  shuffle(pts, nPts);

  return (i, _n, out) => {
    const p = i % nPts;
    out.set(
      pts[p * 2] + rnd(0.3),
      pts[p * 2 + 1] + WORDMARK_LIFT + rnd(0.3),
      rnd(1.4),
    );
  };
}

/* ── name labels (rasterized, for the hover planets) ───── */

const LABEL_RASTER_W = 1024;
const LABEL_RASTER_H = 256;

/** A name rasterized to points, normalized to height 1 and centred at the origin. */
interface NameRaster {
  /** flat [x, y, x, y, …] in label space — height spans 1, width = aspect */
  pts: number[];
  nPts: number;
  /** width / height of the rendered text, so callers preserve its proportions */
  aspect: number;
}

/**
 * Rasterize a project name to a normalized point cloud. Same technique as the
 * wordmark, but the result is recentred and scaled to a unit height so any name
 * can be dropped onto a planet of any radius without distortion.
 */
async function rasterText(text: string): Promise<NameRaster> {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_RASTER_W;
  canvas.height = LABEL_RASTER_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const family =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-syne")
      .trim() || "sans-serif";
  try {
    await document.fonts.load(`800 100px ${family}`);
  } catch {
    /* canvas falls back */
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  let px = 180;
  ctx.font = `800 ${px}px ${family}`;
  const measured = ctx.measureText(text).width;
  px = Math.min((px * (LABEL_RASTER_W * 0.92)) / Math.max(measured, 1), LABEL_RASTER_H * 0.72);
  ctx.font = `800 ${px}px ${family}`;
  ctx.fillText(text, LABEL_RASTER_W / 2, LABEL_RASTER_H / 2);

  const img = ctx.getImageData(0, 0, LABEL_RASTER_W, LABEL_RASTER_H).data;
  const raw: number[] = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let y = 0; y < LABEL_RASTER_H; y += 2) {
    for (let x = 0; x < LABEL_RASTER_W; x += 2) {
      if (img[(y * LABEL_RASTER_W + x) * 4 + 3] > 120) {
        raw.push(x, y);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Normalize about the glyphs' bounding box so height === 1 regardless of length.
  const height = Math.max(maxY - minY, 1);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const pts: number[] = [];
  for (let p = 0; p < raw.length; p += 2) {
    pts.push((raw[p] - centerX) / height, (centerY - raw[p + 1]) / height);
  }
  const nPts = pts.length / 2;
  shuffle(pts, nPts);

  return { pts, nPts, aspect: (maxX - minX) / height };
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

/**
 * Four distinct worlds resting on a shared lane — the project index. Varied
 * radii, a little depth (z), and a tilted orbital ring around each make every
 * one read as its own planet rather than a bare sphere.
 */
function planetLane(): Formation {
  const radii = [3.3, 2.6, 3.7, 2.4];
  const xs = [-18, -6, 6, 18];
  const ys = [2, -1, 1, -2];
  const zs = [0, 4.5, -4.5, 2];
  const tilts = [0.5, -0.42, 0.6, -0.5];
  const ringShare = 0.32; // fraction of each planet's particles forming its ring
  const ringRadius = 1.7; // ring radius as a multiple of the planet radius
  const ringFlatten = 0.3; // squash so the ring reads as an ellipse, not a halo
  return (i, _n, out) => {
    const p = i % 4;
    const radius = radii[p];
    if (Math.random() < ringShare) {
      const t = Math.random() * Math.PI * 2;
      const r = radius * ringRadius;
      out.set(Math.cos(t) * r, Math.sin(t) * r * ringFlatten, rnd(0.4));
      out.applyAxisAngle(X_AXIS, tilts[p]);
    } else {
      spherePoint(radius, out);
    }
    out.x += xs[p];
    out.y += ys[p];
    out.z += zs[p];
  };
}

/**
 * One fully-formed world per project: a dense shell, the project's signature
 * feature, and the project name spelled in particles floating in front of it
 * (the first PLANET_LABEL.band of slots; tinted accent at render). Shown while
 * its row is hovered, when the whole field gathers into this single planet.
 */
function planetVariant(
  radius: number,
  feature: "ring" | "moons" | "double-ring" | "halo",
  name: NameRaster,
): Formation {
  // Size the name to the planet: full height, but shrink long names to fit width.
  let labelHeight = radius * PLANET_LABEL.height;
  const maxWidth = radius * PLANET_LABEL.maxWidth;
  if (name.aspect * labelHeight > maxWidth) labelHeight = maxWidth / name.aspect;
  const labelZ = radius + PLANET_LABEL.front;

  return (i, n, out) => {
    if (i < n * PLANET_LABEL.band) {
      // 1. the project name — a billboard floating just ahead of the sphere
      const k = i % name.nPts;
      out.set(
        name.pts[k * 2] * labelHeight + rnd(0.12),
        name.pts[k * 2 + 1] * labelHeight + PLANET_LABEL.y + rnd(0.12),
        labelZ + rnd(0.4),
      );
    } else if (i < n * 0.86) {
      // 2. the planet body — a dense surface shell
      spherePoint(radius, out);
    } else if (feature === "ring" || feature === "double-ring") {
      // 3. the signature feature
      const r =
        feature === "double-ring" && i % 2 === 0 ? radius * 1.9 : radius * 1.55;
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
    // Gather the whole planet (body, feature and name) onto the right half.
    out.x += PLANET_HOVER_X;
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
      rnd(1.6),
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

/**
 * The crystal core: particles strung along the 12 edges of an elongated
 * octahedron — an angular faceted gem rather than a soft blob — with a sparse
 * inner glow. Used by the `crystal` transition variant so the destination reads
 * as solid, refined matter.
 */
function crystalFormation(): Formation {
  const r = 7.5;
  const verts = [
    new THREE.Vector3(0, r * 1.35, 0),
    new THREE.Vector3(0, -r * 1.35, 0),
    new THREE.Vector3(r, 0, 0),
    new THREE.Vector3(-r, 0, 0),
    new THREE.Vector3(0, 0, r),
    new THREE.Vector3(0, 0, -r),
  ];
  // top apex → equator (×4), equator ring (×4), bottom apex → equator (×4)
  const edges = [
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [2, 4],
    [4, 3],
    [3, 5],
    [5, 2],
    [1, 2],
    [1, 3],
    [1, 4],
    [1, 5],
  ];
  return (i, n, out) => {
    if (i < n * 0.18) {
      // inner glow — a faint nucleus suspended inside the lattice
      out.set(gauss(2.0), gauss(2.4), gauss(2.0));
      return;
    }
    const [from, to] = edges[i % edges.length];
    const a = verts[from];
    const b = verts[to];
    const t = Math.random();
    out.set(
      a.x + (b.x - a.x) * t + rnd(0.22),
      a.y + (b.y - a.y) * t + rnd(0.22),
      a.z + (b.z - a.z) * t + rnd(0.22),
    );
  };
}

/* ── packing ───────────────────────────────────────────── */

function makeTexture(
  simSize: number,
  formation: Formation,
  z: number,
): THREE.DataTexture {
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

  const tex = new THREE.DataTexture(
    data,
    simSize,
    simSize,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
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
  out.set(
    r * Math.sin(ph) * Math.cos(th),
    r * Math.cos(ph),
    r * Math.sin(ph) * Math.sin(th),
  );
}

/** Fisher–Yates over xy pairs so consecutive indices don't sit on adjacent pixels */
function shuffle(pts: number[], n: number) {
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const xi = pts[i * 2],
      yi = pts[i * 2 + 1];
    pts[i * 2] = pts[j * 2];
    pts[i * 2 + 1] = pts[j * 2 + 1];
    pts[j * 2] = xi;
    pts[j * 2 + 1] = yi;
  }
}
