"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { causeColor, type TrafficEvent } from "../utils";

/**
 * The map: every traffic event drawn where it is, click one to select it.
 *
 * The events come in as GeoJSON already, so they go into a single source and
 * are styled by their own properties: a line layer for the stretches of road
 * and a circle layer for the single-spot events. MapLibre is not React-aware,
 * so the map lives in a ref and the props are pushed into it from effects.
 */

/**
 * MapLibre ships without a basemap, so this is the smallest style that shows
 * one: raster tiles straight from OpenStreetMap. Swap the source for your own
 * tile server (or any style URL) in production, as the OSM tiles are meant for
 * light use only.
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

/** The whole country fits on screen, which is what the APIs cover. */
const INITIAL_CENTER: [number, number] = [5.3, 52.15];
const INITIAL_ZOOM = 6.3;

/**
 * GeoJSON sources are parsed in a web worker, and MapLibre cannot find its own
 * worker file once Next.js has bundled it, which leaves the layers empty
 * without any error. `scripts/copy-maplibre-worker.mjs` puts the worker under
 * public/maplibre/, and this points MapLibre at it.
 */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const SOURCE_ID = "traffic";
const LINE_LAYER_ID = "traffic-lines";
const POINT_LAYER_ID = "traffic-points";

/** Events without a geometry cannot be drawn, so they are left out here. */
function toFeatureCollection(events: TrafficEvent[]) {
  return {
    type: "FeatureCollection" as const,
    features: events
      .filter((event) => event.geometry !== null)
      .map((event) => ({
        type: "Feature" as const,
        id: event.id,
        geometry: event.geometry!,
        properties: { id: event.id, color: causeColor(event.causeType) },
      })),
  };
}

/** Expression that gives the selected event a different value than the rest. */
function whenSelected(
  selectedId: string | null,
  selected: number,
  rest: number,
): ExpressionSpecification {
  return ["case", ["==", ["get", "id"], selectedId ?? ""], selected, rest];
}

interface TrafficMapProps {
  events: TrafficEvent[];
  selectedId: string | null;
  onSelect(id: string): void;
}

export default function TrafficMap({
  events,
  selectedId,
  onSelect,
}: TrafficMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const eventsRef = useRef(events);
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    eventsRef.current = events;
    onSelectRef.current = onSelect;
    selectedIdRef.current = selectedId;
  }, [events, onSelect, selectedId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });
    map.addControl(new NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection(eventsRef.current),
      });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 5,
          "line-opacity": 0.85,
        },
      });
      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 6,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      for (const layer of [LINE_LAYER_ID, POINT_LAYER_ID]) {
        map.on("click", layer, (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string") onSelectRef.current(id);
        });
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      loadedRef.current = true;
      // The layers only exist now, so apply the current selection to them.
      highlight(map, selectedIdRef.current);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // Push new data into the source instead of rebuilding the map, so a refresh
  // leaves the pan and zoom the user set alone.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(events));
  }, [events]);

  // Highlight the selected event and bring it into view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    highlight(map, selectedId);

    const selected = events.find((event) => event.id === selectedId);
    if (selected?.geometry) map.fitBounds(boundsOf(selected), FIT_OPTIONS);
  }, [selectedId, events]);

  return (
    <div
      ref={containerRef}
      className="h-[460px] w-full overflow-hidden rounded-lg border border-gray-200"
    />
  );
}

const FIT_OPTIONS = { padding: 80, maxZoom: 12, duration: 600 };

/** Makes the selected event stand out without touching the other shapes. */
function highlight(map: MapLibreMap, selectedId: string | null) {
  map.setPaintProperty(
    LINE_LAYER_ID,
    "line-width",
    whenSelected(selectedId, 9, 5),
  );
  map.setPaintProperty(
    POINT_LAYER_ID,
    "circle-radius",
    whenSelected(selectedId, 10, 6),
  );
}

/** The area a geometry covers, so the map can zoom to it. */
function boundsOf(event: TrafficEvent): LngLatBounds {
  const geometry = event.geometry!;
  const coordinates =
    geometry.type === "Point" ? [geometry.coordinates] : geometry.coordinates;

  return coordinates.reduce(
    (bounds, position) => bounds.extend(position),
    new LngLatBounds(coordinates[0], coordinates[0]),
  );
}
