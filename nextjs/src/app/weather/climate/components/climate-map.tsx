"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLon } from "../utils";

/**
 * The map: click anywhere or drag the marker to move the location the climate
 * is shown for.
 *
 * MapLibre is not React-aware, so the map and its marker are created
 * imperatively and kept in refs. Everything above this component works with
 * plain props and callbacks.
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

/** A climate year describes a region, so the map opens zoomed out a fair way. */
const INITIAL_ZOOM = 6;

const MARKER_COLOR = "#111827";

interface ClimateMapProps {
  /** The location the climate is shown for, marked with a pin. */
  picked: LatLon;
  onPick(location: LatLon): void;
}

export default function ClimateMap({ picked, onPick }: ClimateMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  /** Set while the marker itself moved the location, so the map stays put. */
  const skipRecenterRef = useRef(false);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const onPickRef = useRef(onPick);
  const pickedRef = useRef(picked);
  useEffect(() => {
    onPickRef.current = onPick;
    pickedRef.current = picked;
  }, [onPick, picked]);

  // The map and its marker share one lifecycle: both are created here and both
  // go away together, so a remount cannot leave the marker behind on a map
  // that no longer exists.
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

    const marker = new Marker({ color: MARKER_COLOR, draggable: true })
      .setLngLat([start.longitude, start.latitude])
      .addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      // The marker is already where it was dropped; recentring on it now would
      // pull the map out from under the cursor.
      skipRecenterRef.current = true;
      onPickRef.current({ latitude: lat, longitude: lng });
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Keep the marker on the picked location and follow it, unless the marker is
  // what moved the location in the first place.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const position: [number, number] = [picked.longitude, picked.latitude];
    marker.setLngLat(position);

    if (skipRecenterRef.current) skipRecenterRef.current = false;
    else map.easeTo({ center: position });
  }, [picked]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200"
    />
  );
}
