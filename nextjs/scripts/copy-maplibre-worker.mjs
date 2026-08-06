/**
 * Copies the MapLibre GL worker into public/maplibre/.
 *
 * MapLibre 6 loads its worker from a file next to its own bundle, which it
 * finds through `import.meta.url`. Next.js rewrites that during bundling, so
 * the lookup comes up empty and the worker fails to start. The basemap still
 * draws, but anything that needs the worker (GeoJSON and vector sources, so
 * the Traffic example) silently stays empty.
 *
 * Copying the two dist files to a fixed path lets the map point at them with
 * `setWorkerUrl()`. They are copied rather than committed so they cannot drift
 * from the installed version; `npm run dev` and `npm run build` both run this
 * first.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// The worker imports the shared chunk with a relative path, so both files have
// to end up in the same folder.
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const dist = join(
  dirname(createRequire(import.meta.url).resolve("maplibre-gl/package.json")),
  "dist",
);
const target = new URL("../public/maplibre/", import.meta.url);

await mkdir(target, { recursive: true });
for (const file of FILES) {
  await copyFile(join(dist, file), new URL(file, target));
}
