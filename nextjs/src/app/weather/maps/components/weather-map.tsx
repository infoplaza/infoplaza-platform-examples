"use client";

import { useState } from "react";
import {
  BaseMap,
  MAP_STYLES,
  MapControlHud,
} from "@infoplaza/platform/components";
import MapEventsProvider from "@infoplaza/platform/events";
import LayerComposer from "@infoplaza/platform/layers/composer";
import Overlay from "@infoplaza/platform/layers/overlay";
import { Providers, useModels } from "@infoplaza/platform/providers";
import "maplibre-gl/dist/maplibre-gl.css";
// The utilities the package's own components are styled with. This is the
// embed build: prefixed classes only, no reset, so it cannot reach the rest
// of the app. A standalone app would import styles.css instead.
import "@infoplaza/platform/styles.embed.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
import {
  DEFAULT_MAP_STYLE_KEY,
  DEFAULT_VIEW_STATE,
  DEFAULT_WEATHER_CONFIG,
  formatCoordinates,
  type ViewState,
} from "../utils";

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
 * attached there.
 */
export default function WeatherMap() {
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);
  const [mapStyleKey, setMapStyleKey] = useState(DEFAULT_MAP_STYLE_KEY);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          Drag to pan and scroll to zoom. The panel on the map changes the
          model, the layer and the moment it is drawn for.
        </p>

        <label className="flex items-center gap-2 text-xs text-gray-500">
          Basemap
          <select
            value={mapStyleKey}
            onChange={(event) => setMapStyleKey(event.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-900"
          >
            {MAP_STYLES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* `ip-platform` is the wrapper the package asks its subtree to be in:
          the class names are prefixed and cannot collide either way, but the
          wrapper is what its dark mode, fullscreen and icon colours hang on. */}
      <div className="ip-platform relative h-[560px] overflow-hidden rounded-lg border border-gray-200">
        <Providers
          weatherConfig={DEFAULT_WEATHER_CONFIG}
          // The catalog request these settle: production models, and the beta
          // ones left out. It goes to /api/platform/models, which is the
          // default and where the handler is mounted.
          modelsConfig={{ apiEnv: "prod", betaModels: false }}
        >
          <ModelsNotice />

          <BaseMap
            viewState={viewState}
            onMove={(event) =>
              setViewState((event as { viewState: ViewState }).viewState)
            }
            mapStyles={MAP_STYLES}
            mapStyleKey={mapStyleKey}
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
                        <Overlay layers={[...layers]} interleaved controller />
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
