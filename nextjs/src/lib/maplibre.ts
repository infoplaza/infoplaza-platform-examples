"use client";

import { setWorkerUrl } from "maplibre-gl";

/**
 * Points MapLibre at the worker copied into public/maplibre/ by
 * `scripts/copy-maplibre-worker.mjs`.
 *
 * MapLibre 6 finds its own worker through `import.meta.url`, which Next.js
 * rewrites while bundling, so the default lookup 404s and the worker never
 * starts. The basemap still draws, because raster tiles are decoded on the
 * main thread, but everything parsed in the worker (GeoJSON and vector
 * sources) silently stays empty.
 *
 * This is one shared module rather than a call in each map because MapLibre's
 * workers are global and are created only once, by the first map on the page.
 * MapLibre keeps its own handle on that pool for as long as the page lives, so
 * the pool is never emptied and never rebuilt, and a `setWorkerUrl()` that
 * runs later has nothing left to point anywhere. A map that skipped the call
 * would therefore not just break itself: it would leave every map reached from
 * it by client navigation with the workers that failed to start.
 *
 * So every map component imports this module, and none of them set the URL
 * themselves.
 */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
