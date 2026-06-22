// Compresses the raw spaceship GLBs (kept in /models-src) into web-ready GLBs
// in /public/models. Re-runnable: it always reads the pristine source, so tuning
// a setting and re-running never compounds compression artifacts.
//
// The raw Sketchfab exports ship 4K PNG textures (~90 MB of VRAM *each*) and
// junk UV channels. The Services section loads all four ships at once, so the
// real budget is GPU memory, not just download size — hence the hard cap on
// texture resolution below.

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE_DIRECTORY = "models-src";
const OUTPUT_DIRECTORY = "public/models";

// 1024² keeps each texture at ~5.6 MB VRAM (vs ~90 MB at 4K) — invisible on
// ships that never fill the screen. WebP collapses the PNG bloat on disk.
const TEXTURE_SIZE = 1024;
const TEXTURE_FORMAT = "webp";
const GEOMETRY_COMPRESSION = "draco";

function formatMegabytes(byteCount) {
  return `${(byteCount / 1024 / 1024).toFixed(2)} MB`;
}

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

const modelFileNames = readdirSync(SOURCE_DIRECTORY).filter((fileName) =>
  fileName.endsWith(".glb"),
);

for (const fileName of modelFileNames) {
  const inputPath = join(SOURCE_DIRECTORY, fileName);
  const outputPath = join(OUTPUT_DIRECTORY, fileName);
  const sizeBefore = statSync(inputPath).size;

  execFileSync(
    "npx",
    [
      "--yes",
      "@gltf-transform/cli@latest",
      "optimize",
      inputPath,
      outputPath,
      "--texture-size",
      String(TEXTURE_SIZE),
      "--texture-compress",
      TEXTURE_FORMAT,
      "--compress",
      GEOMETRY_COMPRESSION,
    ],
    { stdio: "inherit", shell: true },
  );

  const sizeAfter = statSync(outputPath).size;
  const reduction = (100 * (1 - sizeAfter / sizeBefore)).toFixed(1);
  console.log(
    `\n✓ ${fileName}: ${formatMegabytes(sizeBefore)} → ${formatMegabytes(
      sizeAfter,
    )}  (−${reduction}%)\n`,
  );
}
