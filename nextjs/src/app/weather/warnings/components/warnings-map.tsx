"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type ExpressionSpecification,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
import {
  countryFlag,
  formatWindow,
  LEVELS,
  levelMeta,
  NEUTRAL_LEVEL,
  type LatLon,
  type WarningAreaFeature,
} from "../utils";

/**
 * The map: click anywhere to move the pin, or drag the pin itself.
 *
 * It answers two questions at once. The areas show where in Europe anything
 * is warned about, drawn from the Weather Warnings Geo API in the colour of
 * their level, so it is plain where a click will find something. The pin
 * answers for the point it stands on, from the Weather Warnings API: it takes
 * the colour of the severest warning in force there and shows how many there
 * are, grey when the location has none.
 *
 * MapLibre is not React-aware, so the map and its marker are created
 * imperatively and kept in refs. Everything above this component works with
 * plain props and callbacks.
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

/**
 * Far enough out to see most of Europe, which is what the areas cover, while
 * the pin is still on the city the page opens on.
 */
const INITIAL_ZOOM = 4;

const AREAS_SOURCE = "warning-areas";
const AREAS_FILL_LAYER = "warning-areas-fill";
const AREAS_ACTIVE_LINE_LAYER = "warning-areas-active-line";
const AREAS_UPCOMING_LINE_LAYER = "warning-areas-upcoming-line";

/** Each area in the colour of its level, the same palette as the pills. */
const LEVEL_COLOR: ExpressionSpecification = [
  "match",
  ["get", "level"],
  1,
  LEVELS[1].color,
  2,
  LEVELS[2].color,
  3,
  LEVELS[3].color,
  4,
  LEVELS[4].color,
  NEUTRAL_LEVEL.color,
];

const PIN_WIDTH = 32;
const PIN_HEIGHT = 44;
/** The round head of the pin, which the count sits in. */
const PIN_HEAD = 32;

interface WarningsMapProps {
  /** Every warning area in Europe, from the Geo endpoint. */
  areas: WarningAreaFeature[];
  picked: LatLon;
  /** Severest level in force at the pin, or null when nothing is. */
  level: number | null;
  /** How many warnings the pin stands for. */
  count: number;
  onPick(location: LatLon): void;
}

export default function WarningsMap({
  areas,
  picked,
  level,
  count,
  onPick,
}: WarningsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  /** The parts of the pin that change with the warnings behind it. */
  const pinRef = useRef<{ shape: SVGPathElement; label: HTMLSpanElement } | null>(
    null,
  );
  /** Set while the pin itself moved the location, so the map stays put. */
  const skipRecenterRef = useRef(false);
  /** The areas layers only exist once the style has loaded. */
  const loadedRef = useRef(false);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const onPickRef = useRef(onPick);
  const pickedRef = useRef(picked);
  const areasRef = useRef(areas);
  useEffect(() => {
    onPickRef.current = onPick;
    pickedRef.current = picked;
    areasRef.current = areas;
  }, [onPick, picked, areas]);

  // The map and its pin share one lifecycle: both are created here and both
  // go away together, so a remount cannot leave the pin behind on a map that
  // no longer exists.
  useEffect(() => {
    if (!containerRef.current) return;

    const start = pickedRef.current;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [start.longitude, start.latitude],
      zoom: INITIAL_ZOOM,
    });
    map.addControl(new NavigationControl(), "top-right");
    map.on("click", (event) =>
      onPickRef.current({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      }),
    );

    const tooltip = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      maxWidth: "280px",
    });

    map.on("load", () => {
      map.addSource(AREAS_SOURCE, {
        type: "geojson",
        data: toFeatureCollection(areasRef.current),
      });
      // Areas overlap, so the severest is drawn last and stays on top.
      map.addLayer({
        id: AREAS_FILL_LAYER,
        type: "fill",
        source: AREAS_SOURCE,
        layout: { "fill-sort-key": ["get", "level"] },
        paint: {
          "fill-color": LEVEL_COLOR,
          // What has not started yet is there, but quieter.
          "fill-opacity": ["case", ["get", "active"], 0.35, 0.12],
        },
      });
      map.addLayer({
        id: AREAS_ACTIVE_LINE_LAYER,
        type: "line",
        source: AREAS_SOURCE,
        filter: ["==", ["get", "active"], true],
        layout: { "line-sort-key": ["get", "level"] },
        paint: { "line-color": LEVEL_COLOR, "line-width": 1 },
      });
      map.addLayer({
        id: AREAS_UPCOMING_LINE_LAYER,
        type: "line",
        source: AREAS_SOURCE,
        filter: ["==", ["get", "active"], false],
        layout: { "line-sort-key": ["get", "level"] },
        paint: {
          "line-color": LEVEL_COLOR,
          "line-width": 1,
          "line-dasharray": [2, 2],
        },
      });

      // The tooltip names what is under the cursor; clicking still moves the
      // pin there, which is how to read the warnings in full.
      map.on("mousemove", AREAS_FILL_LAYER, (event) => {
        const ids = new Set(event.features?.map((feature) => feature.id));
        const hovered = areasRef.current
          .filter((area) => ids.has(area.id))
          .sort((a, b) => b.properties.level - a.properties.level);
        if (hovered.length === 0) return;

        tooltip
          .setLngLat(event.lngLat)
          .setDOMContent(tooltipContent(hovered))
          .addTo(map);
        // The tooltip sits under the cursor, so it has to let the clicks and
        // moves meant for the map below it through.
        tooltip.getElement().style.pointerEvents = "none";
      });
      map.on("mouseleave", AREAS_FILL_LAYER, () => tooltip.remove());

      loadedRef.current = true;
    });

    const pin = createPin();
    const marker = new Marker({
      element: pin.element,
      anchor: "bottom",
      draggable: true,
    })
      .setLngLat([start.longitude, start.latitude])
      .addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      // The pin is already where it was dropped; recentring on it now would
      // pull the map out from under the cursor.
      skipRecenterRef.current = true;
      onPickRef.current({ latitude: lat, longitude: lng });
    });

    mapRef.current = map;
    markerRef.current = marker;
    pinRef.current = { shape: pin.shape, label: pin.label };
    return () => {
      tooltip.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      pinRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // Push new areas into the source instead of rebuilding the map, so a change
  // of language leaves the pan and zoom alone. Areas that arrive before the
  // style has loaded are picked up from the ref when it does.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource(AREAS_SOURCE) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(areas));
  }, [areas]);

  // Keep the pin on the picked location and follow it, unless the pin is what
  // moved the location in the first place.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const position: [number, number] = [picked.longitude, picked.latitude];
    marker.setLngLat(position);

    if (skipRecenterRef.current) skipRecenterRef.current = false;
    else map.easeTo({ center: position });
  }, [picked]);

  // Recolour the same pin rather than replace it, so a lookup never takes the
  // marker out from under a drag.
  useEffect(() => {
    const pin = pinRef.current;
    if (!pin) return;

    const meta = level === null ? NEUTRAL_LEVEL : levelMeta(level);
    pin.shape.setAttribute("fill", meta.color);
    pin.label.style.color = meta.textColor;
    pin.label.textContent = count > 0 ? String(count) : "";
  }, [level, count]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-lg border border-cloud-dark bg-white"
    />
  );
}

/** A teardrop pin whose colour and count are set from the warnings later. */
function createPin(): {
  element: HTMLDivElement;
  shape: SVGPathElement;
  label: HTMLSpanElement;
} {
  const element = document.createElement("div");
  element.style.cssText = `
    position: relative;
    width: ${PIN_WIDTH}px;
    height: ${PIN_HEIGHT}px;
    cursor: grab;
  `;

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", String(PIN_WIDTH));
  svg.setAttribute("height", String(PIN_HEIGHT));
  svg.setAttribute("viewBox", `0 0 ${PIN_WIDTH} ${PIN_HEIGHT}`);
  svg.style.display = "block";
  svg.style.filter = "drop-shadow(0 1px 2px rgb(0 0 0 / 0.35))";

  const shape = document.createElementNS(NS, "path");
  shape.setAttribute(
    "d",
    "M16 43 C10 31 2 25 2 16 A14 14 0 1 1 30 16 C30 25 22 31 16 43 Z",
  );
  shape.setAttribute("stroke", "#ffffff");
  shape.setAttribute("stroke-width", "2");
  shape.setAttribute("fill", NEUTRAL_LEVEL.color);
  svg.append(shape);

  const label = document.createElement("span");
  label.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: ${PIN_WIDTH}px;
    height: ${PIN_HEAD}px;
    display: flex;
    align-items: center;
    justify-content: center;
    font: 600 13px/1 system-ui, sans-serif;
    pointer-events: none;
  `;

  element.append(svg, label);
  return { element, shape, label };
}

function toFeatureCollection(
  areas: WarningAreaFeature[],
): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: areas };
}

/**
 * What the tooltip shows: the severest warning under the cursor, and how many
 * more cover the same spot. It is built as DOM rather than as an HTML string,
 * which keeps the text from the API text instead of markup.
 */
function tooltipContent(hovered: WarningAreaFeature[]): HTMLElement {
  const [{ properties: area }, ...others] = hovered;
  const meta = levelMeta(area.level);

  const root = document.createElement("div");
  root.className = "space-y-1";

  const header = document.createElement("div");
  header.className = "flex items-center gap-2";

  const pill = document.createElement("span");
  pill.className = "rounded-full px-2 py-0.5 text-xs font-medium";
  pill.style.backgroundColor = meta.color;
  pill.style.color = meta.textColor;
  pill.textContent = meta.label;

  const country = document.createElement("span");
  country.className = "text-xs text-dark/70";
  country.textContent = `${countryFlag(area.countryCode)} ${area.countryCode}`;

  header.append(pill, country);

  const title = document.createElement("p");
  title.className = "text-sm font-medium text-dark";
  title.textContent = area.title;

  const period = document.createElement("p");
  period.className = "text-xs text-dark/70";
  period.textContent = area.active
    ? formatWindow(area)
    : `Upcoming · ${formatWindow(area)}`;

  root.append(header, title, period);

  if (others.length > 0) {
    const more = document.createElement("p");
    more.className = "text-xs text-dark/70";
    more.textContent = `+ ${others.length} more here. Click to see them all.`;
    root.append(more);
  }
  return root;
}
