"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RoutePoint, Waypoint } from "../utils";

/**
 * The map: click open water to drop a waypoint, click a waypoint to read the
 * forecast at it.
 *
 * The track and the hourly positions along it are a GeoJSON source with a
 * line and a circle layer on top, because they are redrawn on every change to
 * the voyage and the API can answer with a few hundred of them. The waypoints
 * themselves are DOM markers instead: there are only ever a handful, they
 * carry their number, they are dragged with what MapLibre already does for
 * markers, and clicking one is a plain DOM event that never reaches the map —
 * which is what keeps selecting a waypoint from also dropping a new one
 * underneath it.
 *
 * MapLibre is not React-aware, so the map, its markers and its layers are
 * created imperatively and kept in refs. Everything above this component
 * works with plain props and callbacks.
 */

/** From here in, the seamark overlay has marks to draw. */
const SEAMARK_MIN_ZOOM = 9;

/**
 * OpenSeaMap draws the sea, not the land: its tiles are a transparent overlay
 * of buoys, beacons, lights and harbour marks that expects a basemap under
 * it. So the style is two raster sources — OpenStreetMap underneath for the
 * coastline and the towns, the OpenSeaMap seamarks on top.
 *
 * Both are the projects' own tile servers, meant for light use. Swap them for
 * your own tile server (or any style URL) in production.
 */
const MAP_STYLE: StyleSpecification = {
  version: 8,
  // The example opens on the globe; the toggle below swaps this at runtime.
  projection: { type: "globe" },
  // Only drawn under the globe projection, where it is the atmosphere around
  // the planet. It fades out as the horizon leaves the screen.
  sky: {
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.9, 5, 0.4, 7, 0],
  },
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    seamark: {
      type: "raster",
      tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 18,
      attribution:
        '© <a href="https://www.openseamap.org/">OpenSeaMap</a> contributors',
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
    // The seamark tiles are empty above the whole-country zooms, so they are
    // only asked for once zooming in can actually show something.
    {
      id: "seamark",
      type: "raster",
      source: "seamark",
      minzoom: SEAMARK_MIN_ZOOM,
    },
  ],
};

/**
 * GeoJSON sources are parsed in a web worker, and MapLibre cannot find its own
 * worker file once Next.js has bundled it, which leaves the layers empty
 * without any error. `scripts/copy-maplibre-worker.mjs` puts the worker under
 * public/maplibre/, and this points MapLibre at it.
 */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/** Opens on the southern North Sea, where the default voyage runs. */
const INITIAL_CENTER: [number, number] = [2.8, 53];
const INITIAL_ZOOM = 4.5;

const ROUTE_SOURCE = "route";
const ROUTE_LINE_LAYER = "route-line";
const ROUTE_STEPS_LAYER = "route-steps";

const ROUTE_COLOR = "#2563eb";

/**
 * Mercator is the flat map every chart is drawn on; globe is the sphere it is
 * drawn from. The difference is worth seeing on a voyage of any length: a
 * great circle is a curve on the flat map and a straight line on the globe,
 * which is the whole reason to sail one.
 */
type Projection = "globe" | "mercator";

interface ShippingMapProps {
  waypoints: Waypoint[];
  /** The track as the API drew it, or null while there is none. */
  routePoints: RoutePoint[] | null;
  selectedId: number | null;
  onAdd(lat: number, lon: number): void;
  onSelect(id: number): void;
  onMove(id: number, lat: number, lon: number): void;
}

export default function ShippingMap({
  waypoints,
  routePoints,
  selectedId,
  onAdd,
  onSelect,
  onMove,
}: ShippingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  /** The layers only exist once the style has loaded, so the data effects wait. */
  const [ready, setReady] = useState(false);
  const [projection, setProjection] = useState<Projection>("globe");

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const onAddRef = useRef(onAdd);
  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onAddRef.current = onAdd;
    onSelectRef.current = onSelect;
    onMoveRef.current = onMove;
  }, [onAdd, onSelect, onMove]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      map.addSource(ROUTE_SOURCE, {
        type: "geojson",
        data: emptyCollection(),
      });

      map.addLayer({
        id: ROUTE_LINE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ROUTE_COLOR,
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
      });

      // One dot per model hour the ship sails through, which is also every
      // row of the table below the map.
      map.addLayer({
        id: ROUTE_STEPS_LAYER,
        type: "circle",
        source: ROUTE_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 3,
          "circle-color": "#ffffff",
          "circle-stroke-color": ROUTE_COLOR,
          "circle-stroke-width": 2,
        },
      });

      setReady(true);
    });

    // Anywhere that is not a waypoint marker extends the voyage. Markers are
    // their own DOM elements above the canvas, so their clicks never land
    // here.
    map.on("click", (event) => {
      onAddRef.current(...position(event.lngLat.lat, event.lngLat.lng));
    });
    map.getCanvas().style.cursor = "crosshair";

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Flat map or globe. Only the projection changes: the centre, the zoom and
  // everything drawn on the map stay exactly where they were.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setProjection({ type: projection });
  }, [projection, ready]);

  // The track, redrawn whenever the voyage or its settings change. Until the
  // API has answered, the waypoints are joined straight so the map still
  // shows the shape of what was asked for.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const source = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(waypoints, routePoints));
  }, [waypoints, routePoints, ready]);

  // The waypoints. There are few enough that replacing all of them is
  // cheaper than working out which one moved.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = waypoints.map((waypoint, index) => {
      const element = waypointElement(index + 1, waypoint.id === selectedId);
      const marker = new Marker({ element, draggable: true })
        .setLngLat([waypoint.lon, waypoint.lat])
        .addTo(map);

      // A drag ends on the marker with a click, which would otherwise be read
      // as asking for the forecast where the waypoint no longer is.
      let dragged = false;
      marker.on("dragstart", () => {
        dragged = false;
      });
      marker.on("drag", () => {
        dragged = true;
      });
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onMoveRef.current(waypoint.id, ...position(lat, lng));
      });

      element.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!dragged) onSelectRef.current(waypoint.id);
      });
      return marker;
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [waypoints, selectedId]);

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-lg border border-gray-200">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute left-2 top-2 flex overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm">
        {(["mercator", "globe"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setProjection(option)}
            aria-pressed={projection === option}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              projection === option
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {option === "mercator" ? "2D" : "3D"}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A numbered dot for one waypoint, blue while it is the selected one. */
function waypointElement(number: number, selected: boolean): HTMLElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = String(number);
  element.title = `Waypoint ${number} — click for its forecast, drag to move it`;
  element.className = selected
    ? "flex h-7 w-7 cursor-grab items-center justify-center rounded-full border-2 border-white bg-blue-600 text-xs font-semibold text-white shadow-md active:cursor-grabbing"
    : "flex h-6 w-6 cursor-grab items-center justify-center rounded-full border-2 border-white bg-gray-900 text-xs font-semibold text-white shadow-md hover:bg-gray-700 active:cursor-grabbing";
  return element;
}

/**
 * The track as one line, with a dot at every hourly position on it.
 *
 * The API's own points are used when they are there: they follow the routing
 * that was asked for, so a great circle arrives already drawn as the curve it
 * is on a flat map. Before that, and while a change is in flight, the
 * waypoints are joined straight.
 */
function toFeatureCollection(
  waypoints: Waypoint[],
  routePoints: RoutePoint[] | null,
): GeoJSON.FeatureCollection {
  const track = routePoints?.length
    ? routePoints
    : waypoints.map((waypoint) => ({ lat: waypoint.lat, lon: waypoint.lon }));

  if (track.length < 2) return emptyCollection();

  const line: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: track.map((point) => [point.lon, point.lat]),
    },
  };

  const steps = (routePoints ?? [])
    .filter((point) => point.type === "timestep")
    .map<GeoJSON.Feature<GeoJSON.Point>>((point) => ({
      type: "Feature",
      properties: { time: point.time },
      geometry: { type: "Point", coordinates: [point.lon, point.lat] },
    }));

  return { type: "FeatureCollection", features: [line, ...steps] };
}

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

/**
 * A position on the map as a waypoint holds it: four decimals, which is about
 * ten metres, and a longitude wrapped back onto the chart. Panning east past
 * the date line keeps counting up, so a click out there arrives as 190°
 * rather than as -170°.
 */
function position(lat: number, lng: number): [number, number] {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return [Number(lat.toFixed(4)), Number(wrapped.toFixed(4))];
}
