"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
import { levelMeta, NEUTRAL_LEVEL, type LatLon } from "../utils";

/**
 * The map: click anywhere to move the pin, or drag the pin itself.
 *
 * Warnings have no geometry of their own — they answer for a point, not for
 * an area — so the map has one marker and the marker carries the answer: it
 * takes the colour of the severest warning in force and shows how many there
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

/** Warnings cover regions, so the map opens on the whole area around a city. */
const INITIAL_ZOOM = 6;

const PIN_WIDTH = 32;
const PIN_HEIGHT = 44;
/** The round head of the pin, which the count sits in. */
const PIN_HEAD = 32;

interface WarningsMapProps {
  picked: LatLon;
  /** Severest level in force at the pin, or null when nothing is. */
  level: number | null;
  /** How many warnings the pin stands for. */
  count: number;
  onPick(location: LatLon): void;
}

export default function WarningsMap({
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

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const onPickRef = useRef(onPick);
  const pickedRef = useRef(picked);
  useEffect(() => {
    onPickRef.current = onPick;
    pickedRef.current = picked;
  }, [onPick, picked]);

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
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      pinRef.current = null;
    };
  }, []);

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
      className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200"
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
