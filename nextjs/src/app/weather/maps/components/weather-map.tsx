"use client";

import { useEffect, useState } from "react";
import { BaseMap, MapControlHud } from "@infoplaza/platform/components";
import MapEventsProvider from "@infoplaza/platform/events";
import LayerComposer from "@infoplaza/platform/layers/composer";
import Overlay from "@infoplaza/platform/layers/overlay";
import { Providers, useModels } from "@infoplaza/platform/providers";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// The utilities the package's own components are styled with. This is the
// embed build: prefixed classes only, no reset, so it cannot reach the rest
// of the app. A standalone app would import styles.css instead.
import "@infoplaza/platform/styles.embed.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
// Answers the one thing Deck.gl asks MapLibre for that MapLibre 6 moved.
import "../deck-maplibre";
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
 * basemaps of its own in `MAP_STYLES`, which is what an app that has a key for
 * them would pass instead.
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
 * That style, as `BaseMap` takes one: the source, and the layer the weather is
 * inserted under. Here that is nothing, which is what the empty `beforeId`
 * says: these tiles arrive with their labels drawn into the image, so there is
 * no label layer to slide under and the weather goes on top of the lot.
 */
const BASE_MAP_STYLE = {
  styles: { default: { source: MAP_STYLE, beforeId: "" } },
};

/**
 * What the Deck.gl overlay may do with the map's WebGL context.
 *
 * Interleaved means Deck draws in the context MapLibre already owns, and it
 * attaches a device of its own to that context to do so. Two of those
 * attachments can be in flight at once: React Strict Mode mounts every effect
 * twice in development and the map is reused between the two, so the second
 * overlay finds the context taken and fails with "WebGL context already
 * attached to device". The overlay that fails is the one that stays, which is
 * why the map ends up with a basemap and nothing over it. Saying the device
 * may be shared is what makes that second attachment take the device already
 * on the context instead of giving up.
 */
const DECK_DEVICE_PROPS = { _reuseDevices: true };

/**
 * The weather map, as the package composes one.
 *
 * Five pieces, in the order they nest. `Providers` holds the weather
 * configuration and loads the model catalog. `BaseMap` draws the basemap and
 * hands down the `beforeId` the weather layers have to be inserted under, so
 * they land below the labels instead of over them. `MapEventsProvider` turns
 * where the map is looking and which moment is selected into the tile
 * requests that answer it. `LayerComposer` turns those into Deck.gl
 * layers and `Overlay` puts them on the map, interleaved so the basemap keeps
 * its place in the stack. `MapControlHud` is the panel over the map that
 * changes the model, the element and the time.
 *
 * None of it is passed an API key. The components fetch from /api/platform,
 * which is where the package's own route handler is mounted, and the key is
 * attached there. `PlatformLayers` is what makes that true of the layers as
 * well: they are the one call the package would otherwise make to the maps
 * host itself, past this app and past the log.
 */
export default function WeatherMap() {
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          Drag to pan and scroll to zoom. The panel on the map changes the
          model, the layer and the moment it is drawn for.
        </p>

        {/* The package's map draws without an attribution control, so the one
            the basemap asks for is given here. */}
        <p className="text-xs text-gray-500">
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
        className={`ip-platform relative ${MAP_FRAME_CLASS} overflow-hidden rounded-lg border border-gray-200`}
      >
        <Providers
          weatherConfig={DEFAULT_WEATHER_CONFIG}
          // The catalog request these settle: production models, and the beta
          // ones left out. It goes to /api/platform/models, which is the
          // default and where the handler is mounted.
          modelsConfig={{ apiEnv: "prod", betaModels: false }}
        >
          <PlatformLayers />
          <ModelsNotice />

          <BaseMap
            viewState={viewState}
            onMove={(event) =>
              setViewState((event as { viewState: ViewState }).viewState)
            }
            mapStyle={BASE_MAP_STYLE}
          >
            {({ beforeId }: { beforeId: string }) => (
              <>
                <MapEventsProvider handler="demand">
                  {(mapComponents: Record<number, unknown[]>) => (
                    <LayerComposer
                      beforeId={beforeId}
                      mapComponents={mapComponents}
                    >
                      {({ layers }: { layers: unknown[] }) => (
                        <Overlay
                          layers={[...layers]}
                          interleaved
                          deviceProps={DECK_DEVICE_PROPS}
                        />
                      )}
                    </LayerComposer>
                  )}
                </MapEventsProvider>

                <MapControlHud
                  // One map on the page, so it is the only one and it is not
                  // part of a comparison; the callbacks a multiple map view
                  // would use have nothing to do here.
                  mapIndex={0}
                  mapsLength={1}
                  isMultipleMapView={false}
                  onMapsCount={() => {}}
                  onExportChange={() => {}}
                  mapRef={null}
                  viewState={viewState}
                />
              </>
            )}
          </BaseMap>
        </Providers>
      </div>

      <p className="text-xs text-gray-500">
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
 * It sits inside the providers because the catalog is what it needs: which
 * region a model covers is not in the layers answer, and it is what decides
 * how that model's images are scaled. The catalog is loaded once, so this is
 * installed once with nothing in it and again with everything.
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
