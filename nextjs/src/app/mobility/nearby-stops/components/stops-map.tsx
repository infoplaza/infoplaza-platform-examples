"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLon, StopPlace } from "../utils";

/**
 * The map: click anywhere to pick a location, click a dot to pick a stop.
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

const INITIAL_ZOOM = 13;

const PICKED_COLOR = "#111827";
const STOP_COLOR = "#111827";
const SELECTED_STOP_COLOR = "#2563eb";

interface StopsMapProps {
  /** Where the search is centred, shown as a pin. */
  picked: LatLon;
  stops: StopPlace[];
  selectedStopId: string | null;
  onPick(location: LatLon): void;
  onSelectStop(stop: StopPlace): void;
}

export default function StopsMap({
  picked,
  stops,
  selectedStopId,
  onPick,
  onSelectStop,
}: StopsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickedMarkerRef = useRef<Marker | null>(null);
  const stopMarkersRef = useRef<Marker[]>([]);
  /** Set while the pin itself moved the location, so the map stays put. */
  const skipRecenterRef = useRef(false);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const onPickRef = useRef(onPick);
  const onSelectStopRef = useRef(onSelectStop);
  const pickedRef = useRef(picked);
  useEffect(() => {
    onPickRef.current = onPick;
    onSelectStopRef.current = onSelectStop;
    pickedRef.current = picked;
  }, [onPick, onSelectStop, picked]);

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

    const pin = new Marker({ color: PICKED_COLOR, draggable: true })
      .setLngLat([start.longitude, start.latitude])
      .addTo(map);
    // Markers stack in the order they are added, and the stop dots are
    // rebuilt after this one. Lift the pin out of that order so it stays on
    // top, both to see it and to keep it grabbable.
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
      stopMarkersRef.current = [];
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

  // One dot per stop. There are at most a few dozen, so rebuilding them all
  // when the selection changes is simpler than diffing and fast enough.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of stopMarkersRef.current) marker.remove();
    stopMarkersRef.current = stops.map((stop) => {
      const selected = stop.id === selectedStopId;
      const element = document.createElement("button");
      element.type = "button";
      element.title = stop.name;
      element.style.cssText = `
        width: ${selected ? 18 : 14}px;
        height: ${selected ? 18 : 14}px;
        border-radius: 9999px;
        border: 2px solid #ffffff;
        background: ${selected ? SELECTED_STOP_COLOR : STOP_COLOR};
        box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
        cursor: pointer;
        padding: 0;
      `;
      element.addEventListener("click", (event) => {
        // Without this the map's own click handler would move the pin.
        event.stopPropagation();
        onSelectStopRef.current(stop);
      });

      return new Marker({ element })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(map);
    });
  }, [stops, selectedStopId]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200"
    />
  );
}
