"use client";

import { Map as MapLibreMap } from "maplibre-gl";

/**
 * Gives MapLibre back the `transform` that Deck.gl reads.
 *
 * The weather layers are drawn interleaved, which means Deck.gl draws them
 * into the map's own WebGL context and has to know the camera the map is
 * drawing with. It reads that from `map.transform`, which was never a public
 * property and is gone in MapLibre 6: the camera moved to `map._camera`. So
 * every frame Deck.gl draws ends in a TypeError, and the layers never appear
 * over the basemap.
 *
 * The component library asks for MapLibre 5, where the property is still
 * there. This app runs MapLibre 6 for the maps it draws itself and points the
 * library at that same copy, because a second one on the page would come with
 * its own workers and the ones this app fixed up are the only ones that
 * start. This is what that costs: three lines that answer where the camera
 * moved to. It goes away with the Deck.gl release that knows MapLibre 6.
 *
 * On the prototype, because the maps are made inside the library and there is
 * nothing to hand a patched one to. The setter is there so a MapLibre that
 * still assigns its own `transform` can, rather than throwing on a property
 * that only reads.
 */
interface MapWithCamera {
  _transform?: unknown;
  _camera?: { transform?: unknown };
}

if (!("transform" in MapLibreMap.prototype)) {
  Object.defineProperty(MapLibreMap.prototype, "transform", {
    configurable: true,
    get(this: MapWithCamera) {
      return this._transform ?? this._camera?.transform;
    },
    set(this: MapWithCamera, transform: unknown) {
      this._transform = transform;
    },
  });
}
