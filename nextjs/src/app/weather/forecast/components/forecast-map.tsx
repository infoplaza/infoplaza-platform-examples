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
import type { LatLon } from "../utils";

/**
 * The map: click anywhere to move the pin, or drag the pin itself.
 *
 * A second, smaller marker shows where the forecast is actually for. The API
 * snaps a request to the nearest place it forecasts for, which inland is a
 * village away and over open sea can be the far side of an ocean, so the two
 * markers are worth seeing side by side. It is hidden while they are close
 * enough together to be the same dot.
 *
 * MapLibre is not React-aware, so the map and its markers are created
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

const INITIAL_ZOOM = 9;

const PIN_COLOR = "#111827";
const RESOLVED_COLOR = "#2563eb";

/** Below this the two markers overlap, so only the pin is worth drawing. */
const SAME_SPOT_DEGREES = 0.02;

interface ForecastMapProps {
  /** Where the forecast was asked for, shown as a pin. */
  picked: LatLon;
  /** Where the API says the forecast is for, or null while one is loading. */
  resolved: (LatLon & { location: string }) | null;
  onPick(location: LatLon): void;
}

export default function ForecastMap({
  picked,
  resolved,
  onPick,
}: ForecastMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickedMarkerRef = useRef<Marker | null>(null);
  const resolvedMarkerRef = useRef<Marker | null>(null);
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

    const pin = new Marker({ color: PIN_COLOR, draggable: true })
      .setLngLat([start.longitude, start.latitude])
      .addTo(map);
    // Markers stack in the order they are added. Lift the pin above the dot
    // that follows it, both to see it and to keep it grabbable.
    pin.getElement().style.zIndex = "1";
    pin.on("dragend", () => {
      const { lat, lng } = pin.getLngLat();
      // The pin is already where it was dropped; recentring on it now would
      // pull the map out from under the cursor.
      skipRecenterRef.current = true;
      onPickRef.current({ latitude: lat, longitude: lng });
    });

    mapRef.current = map;
    pickedMarkerRef.current = pin;
    return () => {
      map.remove();
      mapRef.current = null;
      pickedMarkerRef.current = null;
      resolvedMarkerRef.current = null;
    };
  }, []);

  // Keep the pin on the picked location and follow it, unless the pin is what
  // moved the location in the first place.
  useEffect(() => {
    const map = mapRef.current;
    const pin = pickedMarkerRef.current;
    if (!map || !pin) return;

    const position: [number, number] = [picked.longitude, picked.latitude];
    pin.setLngLat(position);

    if (skipRecenterRef.current) skipRecenterRef.current = false;
    else map.easeTo({ center: position });
  }, [picked]);

  // The dot for the place the forecast turned out to be for. There is at most
  // one, so it is replaced rather than diffed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    resolvedMarkerRef.current?.remove();
    resolvedMarkerRef.current = null;

    if (!resolved) return;
    const apart =
      Math.abs(resolved.latitude - picked.latitude) +
      Math.abs(resolved.longitude - picked.longitude);
    if (apart < SAME_SPOT_DEGREES) return;

    const element = document.createElement("div");
    element.title = resolved.location;
    element.style.cssText = `
      width: 14px;
      height: 14px;
      border-radius: 9999px;
      border: 2px solid #ffffff;
      background: ${RESOLVED_COLOR};
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
    `;

    resolvedMarkerRef.current = new Marker({ element })
      .setLngLat([resolved.longitude, resolved.latitude])
      .addTo(map);
  }, [resolved, picked]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200"
    />
  );
}
