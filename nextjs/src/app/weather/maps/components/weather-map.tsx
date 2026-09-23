"use client";

import { useEffect, useState } from "react";
import { PlatformMap, WeatherLayers } from "@infoplaza/platform/components";
import { useModels } from "@infoplaza/platform/providers";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// The utilities the package's own components are styled with. This is the
// embed build: prefixed classes only, no reset, so it cannot reach the rest
// of the app. A standalone app would import styles.css instead.
import "@infoplaza/platform/styles.embed.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
import { installLayersProxy } from "../layers";
import {
  DEFAULT_VIEW_STATE,
  DEFAULT_WEATHER_CONFIG,
  formatCoordinates,
  MAP_FRAME_CLASS,
  type ViewState,
} from "../utils";

/**
 * MapLibre ships without a basemap, so this is the smallest style that shows
 * one: raster tiles straight from OpenStreetMap, as every other example here
 * draws. Swap the source for your own tile server (or any style URL) in
 * production: the OSM tiles are meant for light use only. The package ships
 * vector basemaps of its own in `MAP_STYLES`, which `PlatformMap` draws when
 * it is given no style at all.
 */
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/**
 * That style, as `PlatformMap` takes one.
 *
 * A style may also name the basemap layer the weather is drawn under, in
 * `beforeId`, so that borders and labels stay on top of it. This one does not:
 * these tiles arrive with their labels drawn into the image, so there is no
 * layer to slide under. That is also why the overlay below is not interleaved
 * — see `WeatherMap`.
 */
const BASE_MAP_STYLE = {
  styles: { default: { source: MAP_STYLE } },
};

/**
 * The weather map, as the package composes one.
 *
 * Two pieces. `PlatformMap` draws the basemap and owns the camera.
 * `WeatherLayers` is everything over it: the weather configuration, the model
 * catalog, the layer requests that follow the map, the Deck.gl overlay they
 * are drawn in, and — with `showHud` — the panel that changes the model, the
 * element and the moment. Which of the package's handlers turns the frame into
 * requests is left to it, because that depends on the model: a regional one is
 * asked for its own extent once, a global one for whatever is in view.
 *
 * `interleaved` is off because the basemap is a single raster layer. Drawing
 * interleaved means handing the weather to MapLibre to slot into its own layer
 * stack, and it needs a layer to slot in front of; where it cannot find the
 * one it was given, the package draws nothing at all rather than draw the
 * weather over the labels. A vector basemap names that layer in `beforeId` and
 * gets the weather under the labels; a raster one has nothing to name, so the
 * overlay is drawn over the map instead, which is where it was going anyway.
 *
 * None of it is passed an API key. The components fetch from /api/platform,
 * which is where the package's own route handler is mounted, and the key is
 * attached there. `PlatformLayers` is what makes that true of the layers as
 * well: they are the one call the package would otherwise make to the tile
 * host itself, past this app and past the log.
 */
export default function WeatherMap() {
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-dark/70">
          Drag to pan and scroll to zoom. The panel on the map changes the
          model, the layer and the moment it is drawn for.
        </p>

        {/* The package's map draws without an attribution control, so the one
            the basemap asks for is given here. */}
        <p className="text-xs text-dark/70">
          Basemap ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            OpenStreetMap
          </a>{" "}
          contributors
        </p>
      </div>

      {/* `ip-platform` is the wrapper the package asks its subtree to be in:
          the class names are prefixed and cannot collide either way, but the
          wrapper is what its dark mode, fullscreen and icon colours hang on. */}
      <div
        className={`ip-platform relative ${MAP_FRAME_CLASS} overflow-hidden rounded-lg border border-cloud-dark bg-white`}
      >
        <PlatformMap
          viewState={viewState}
          onMove={(event) =>
            setViewState((event as { viewState: ViewState }).viewState)
          }
          mapStyle={BASE_MAP_STYLE}
        >
          <WeatherLayers
            weatherConfig={DEFAULT_WEATHER_CONFIG}
            interleaved={false}
            showHud
          >
            <PlatformLayers />
            <ModelsNotice />
          </WeatherLayers>
        </PlatformMap>
      </div>

      <p className="text-xs text-dark/70">
        Looking at{" "}
        <span className="tabular-nums">{formatCoordinates(viewState)}</span> at
        zoom <span className="tabular-nums">{viewState.zoom.toFixed(1)}</span>
      </p>
    </div>
  );
}

/**
 * Sends the layer requests to the Platform for as long as the map is open.
 *
 * A child of `WeatherLayers`, which is what puts it inside the providers, and
 * the catalog is why it has to be: which region a model covers is not in the
 * layers answer, and it is what decides how that model's images are scaled.
 * The catalog is loaded once, so this is installed once with nothing in it and
 * again with everything.
 */
function PlatformLayers() {
  const { models } = useModels();

  useEffect(
    () =>
      installLayersProxy(
        (model) =>
          models.find((candidate) => candidate.slug === model)?.regionCategory,
      ),
    [models],
  );

  return null;
}

/**
 * What the map cannot say for itself.
 *
 * Every layer is drawn from the model catalog, so a catalog that did not load
 * leaves a basemap with nothing on it and a control panel with nothing to
 * choose from. `useModels` is the same context the components read, which is
 * why the message can only say what they already know.
 */
function ModelsNotice() {
  const { models, loading, error } = useModels();

  if (loading || (!error && models.length > 0)) return null;

  return (
    <div className="absolute inset-x-0 top-0 z-10 border-b border-amber-200 bg-amber-50/95 px-4 py-2.5 text-xs text-amber-900">
      {error
        ? `The model catalog did not load: ${error.message}. The map draws its layers from it, so it stays empty until it does.`
        : "The model catalog came back empty, so there are no layers to draw."}
    </div>
  );
}
