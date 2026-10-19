"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type FilterSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
import { stationName, type Bounds, type LatLon, type Station } from "../utils";

/**
 * The map: every station of the network as a dot, a pin where a point was
 * looked up, and the readings of the stations in view as labels.
 *
 * Clicking a dot asks for that station; clicking anywhere else asks for the
 * station nearest to the spot. One click handler decides which, by asking
 * MapLibre whether a dot is under the cursor — two handlers would both fire
 * for a click on a dot.
 *
 * The stations are a GeoJSON source with a circle layer rather than one DOM
 * marker each, because WMO SYNOP alone has 14,600 of them. The readings are
 * DOM markers, because they carry text and there are never more than a
 * hundred. MapLibre is not React-aware, so the map is created imperatively
 * and kept in a ref.
 */

/**
 * MapLibre ships without a basemap, so this is the smallest style that shows
 * one: raster tiles straight from OpenStreetMap. Swap the source for your own
 * tile server (or any style URL) in production — the OSM tiles are meant for
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

/** Opens on the Netherlands, where the default network's stations are. */
const INITIAL_CENTER: [number, number] = [5.2, 52.2];
const INITIAL_ZOOM = 6.3;

/** How far to zoom in on a station that was picked off screen. */
const STATION_ZOOM = 8;

/** Pixels around the cursor that still count as clicking a dot. */
const HIT_TOLERANCE = 4;

const STATIONS_SOURCE = "stations";
const STATIONS_LAYER = "stations-circles";
const ACTIVE_LAYER = "stations-active";

const STATION_COLOR = "#2e2e2b";
const ACTIVE_COLOR = "#0070de";

/** A reading drawn on the map at the station it was measured at. */
export interface MapLabel {
  /** Unique among the labels: the station id. */
  id: number;
  lat: number;
  lng: number;
  text: string;
}

interface ObservationsMapProps {
  stations: Station[];
  /** The station the details are about, highlighted wherever it is drawn. */
  active: Station | null;
  /** Where a point was looked up, or null when none was. */
  picked: LatLon | null;
  labels: MapLabel[];
  onSelectStation(stationId: number): void;
  onPick(location: LatLon): void;
  onSelectLabel(id: number): void;
  /** The part of the world in view, after every pan and zoom. */
  onViewChange(bounds: Bounds): void;
}

export default function ObservationsMap({
  stations,
  active,
  picked,
  labels,
  onSelectStation,
  onPick,
  onSelectLabel,
  onViewChange,
}: ObservationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const labelMarkersRef = useRef<Marker[]>([]);
  /** The layers only exist once the style has loaded, so the data effects wait. */
  const [ready, setReady] = useState(false);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const callbacksRef = useRef({
    onSelectStation,
    onPick,
    onSelectLabel,
    onViewChange,
  });
  const stationsRef = useRef(stations);
  useEffect(() => {
    callbacksRef.current = {
      onSelectStation,
      onPick,
      onSelectLabel,
      onViewChange,
    };
    stationsRef.current = stations;
  }, [onSelectStation, onPick, onSelectLabel, onViewChange, stations]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });
    map.addControl(new NavigationControl(), "top-right");

    // A dot is too small to carry a name, so hovering one names it.
    const hover = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });

    const reportView = () =>
      callbacksRef.current.onViewChange(viewBounds(map));
    map.on("moveend", reportView);

    // `style.load`, not `load`: `load` waits for every OpenStreetMap tile in
    // the opening view, and those are rate limited, so one slow tile would
    // keep the stations off the map. The style is all a source needs.
    map.on("style.load", () => {
      map.addSource(STATIONS_SOURCE, {
        type: "geojson",
        data: toFeatureCollection(stationsRef.current),
      });

      map.addLayer({
        id: STATIONS_LAYER,
        type: "circle",
        source: STATIONS_SOURCE,
        paint: {
          "circle-color": STATION_COLOR,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 8, 5],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });

      // The active station is the same dot drawn again on top, larger and in
      // colour. Filtering a layer down to one id is cheaper than rewriting
      // the source every time the selection moves.
      map.addLayer({
        id: ACTIVE_LAYER,
        type: "circle",
        source: STATIONS_SOURCE,
        filter: activeFilter(null),
        paint: {
          "circle-color": ACTIVE_COLOR,
          "circle-radius": 8,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });

      map.on("mousemove", STATIONS_LAYER, (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        map.getCanvas().style.cursor = "pointer";
        hover.setLngLat(event.lngLat).setHTML(hoverLabel(feature)).addTo(map);
      });
      map.on("mouseleave", STATIONS_LAYER, () => {
        map.getCanvas().style.cursor = "";
        hover.remove();
      });

      setReady(true);
      reportView();
    });

    map.on("click", (event) => {
      const { x, y } = event.point;
      const hit = map.getLayer(STATIONS_LAYER)
        ? map.queryRenderedFeatures(
            [
              [x - HIT_TOLERANCE, y - HIT_TOLERANCE],
              [x + HIT_TOLERANCE, y + HIT_TOLERANCE],
            ],
            { layers: [STATIONS_LAYER] },
          )[0]
        : undefined;

      if (hit) {
        callbacksRef.current.onSelectStation(Number(hit.properties.id));
      } else {
        callbacksRef.current.onPick({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
        });
      }
    });

    mapRef.current = map;
    return () => {
      hover.remove();
      map.remove();
      mapRef.current = null;
      pinRef.current = null;
      labelMarkersRef.current = [];
      setReady(false);
    };
  }, []);

  // A new network replaces the whole set of dots.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const source = map.getSource(STATIONS_SOURCE) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(stations));
  }, [stations, ready]);

  // Highlight the active station, and bring it into view when it is off
  // screen — which it is after a lookup by point found one at the edge, or
  // after switching networks moved the selection somewhere else.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    map.setFilter(ACTIVE_LAYER, activeFilter(active?.id ?? null));
    if (!active) return;

    const position: [number, number] = [active.lng, active.lat];
    if (map.getBounds().contains(position)) return;
    map.easeTo({ center: position, zoom: Math.max(map.getZoom(), STATION_ZOOM) });
  }, [active, ready]);

  // The pin where a point was looked up. It stays put after the lookup, so
  // the distance to the station found can be seen on the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!picked) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }

    const position: [number, number] = [picked.longitude, picked.latitude];
    if (pinRef.current) {
      pinRef.current.setLngLat(position);
    } else {
      pinRef.current = new Marker({ element: createPin(), anchor: "bottom" })
        .setLngLat(position)
        .addTo(map);
    }
  }, [picked]);

  // The readings in view. There are at most a hundred and they only change
  // when a new set is fetched or another value is picked, so they are simply
  // replaced. A click on a marker never reaches the map, so picking a label
  // does not also look up the point underneath it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of labelMarkersRef.current) marker.remove();
    labelMarkersRef.current = labels.map((label) => {
      const element = createLabel(label.text, label.id === active?.id);
      element.addEventListener("click", () =>
        callbacksRef.current.onSelectLabel(label.id),
      );
      return new Marker({ element, anchor: "bottom", offset: [0, -6] })
        .setLngLat([label.lng, label.lat])
        .addTo(map);
    });
  }, [labels, active]);

  return (
    <div
      ref={containerRef}
      className="h-[480px] w-full overflow-hidden rounded-lg border border-cloud-dark bg-white"
    />
  );
}

/**
 * What is in view, in the order the Area endpoint takes it. Zoomed out far
 * enough the map shows the world more than once, and `bounds` only takes the
 * one copy of it, so the box is held to that.
 */
function viewBounds(map: MapLibreMap): Bounds {
  const bounds = map.getBounds();
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return [
    round(Math.max(bounds.getWest(), -180)),
    round(Math.max(bounds.getSouth(), -90)),
    round(Math.min(bounds.getEast(), 180)),
    round(Math.min(bounds.getNorth(), 90)),
  ];
}

/** The stations as map features, carrying what the layers and popup need. */
function toFeatureCollection(
  stations: Station[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: stations.map((station) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [station.lng, station.lat] },
      properties: { id: station.id, name: stationName(station) },
    })),
  };
}

/** Matches the active station, or nothing at all when there is none. */
function activeFilter(activeId: number | null): FilterSpecification {
  return ["==", ["get", "id"], activeId ?? -1];
}

function hoverLabel(feature: MapGeoJSONFeature): string {
  // Station names come from the API, so they are escaped before going into HTML.
  return `<span style="font: 500 12px/1.4 system-ui, sans-serif">${escapeHtml(String(feature.properties.name))}</span>`;
}

/** A small dark teardrop, for where a point was looked up. */
function createPin(): HTMLDivElement {
  const element = document.createElement("div");
  element.innerHTML = `
    <svg width="24" height="33" viewBox="0 0 32 44" style="display:block;filter:drop-shadow(0 1px 2px rgb(0 0 0 / 0.35))">
      <path d="M16 43 C10 31 2 25 2 16 A14 14 0 1 1 30 16 C30 25 22 31 16 43 Z" fill="${STATION_COLOR}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="16" cy="16" r="5" fill="#ffffff"/>
    </svg>`;
  // The pin marks the spot; clicks go through it to the map underneath.
  element.style.pointerEvents = "none";
  return element;
}

/** A reading as a small tag above its station. */
function createLabel(text: string, active: boolean): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = text;
  element.style.cssText = `
    padding: 1px 6px;
    border-radius: 9999px;
    border: 1px solid ${active ? ACTIVE_COLOR : "#d0d0c7"};
    background: ${active ? ACTIVE_COLOR : "#ffffff"};
    color: ${active ? "#ffffff" : STATION_COLOR};
    font: 600 11px/1.5 system-ui, sans-serif;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
    cursor: pointer;
    white-space: nowrap;
  `;
  return element;
}

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] as string,
  );
}
