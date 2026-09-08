"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
import { placeKey, type Place } from "../utils";

/**
 * The map beside the result list: one numbered marker per match, numbered the
 * same as in the list, and clickable to select.
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

/** A match can be anywhere on earth, so the map opens on the whole of it. */
const INITIAL_CENTER: [number, number] = [10, 30];
const INITIAL_ZOOM = 1;

/** How far to zoom in on a single result, and on a selected one. */
const PLACE_ZOOM = 9;

/** Keeps a tight cluster of results from filling the frame at street level. */
const MAX_FIT_ZOOM = 9;

const MARKER_COLOR = "#111827";
const SELECTED_MARKER_COLOR = "#2563eb";

interface PlacesMapProps {
  places: Place[];
  selectedKey: string | null;
  onSelect(place: Place): void;
}

export default function PlacesMap({
  places,
  selectedKey,
  onSelect,
}: PlacesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });
    map.addControl(new NavigationControl(), "top-right");

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  // One marker per result. A search returns at most a handful, so rebuilding
  // them all when the selection changes is simpler than diffing and fast
  // enough.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = places.map((place, index) => {
      const selected = placeKey(place) === selectedKey;
      const element = document.createElement("button");
      element.type = "button";
      element.title = place.name;
      element.textContent = String(index + 1);
      element.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 9999px;
        border: 2px solid #ffffff;
        background: ${selected ? SELECTED_MARKER_COLOR : MARKER_COLOR};
        box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
        color: #ffffff;
        font: 600 11px/1 system-ui, sans-serif;
        cursor: pointer;
        padding: 0;
      `;
      // Lift the selected marker above the others so it is never hidden by a
      // result that happens to sit on top of it.
      if (selected) element.style.zIndex = "1";
      element.addEventListener("click", () => onSelectRef.current(place));

      return new Marker({ element })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
    });
  }, [places, selectedKey]);

  // Frame the results whenever a new search comes in. Selecting a result does
  // not run this, so the map stays where it is while you click through a list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || places.length === 0) return;

    if (places.length === 1) {
      const [only] = places;
      map.easeTo({ center: [only.longitude, only.latitude], zoom: PLACE_ZOOM });
      return;
    }

    const bounds = places.reduce(
      (box, place) => box.extend([place.longitude, place.latitude]),
      new LngLatBounds(),
    );
    map.fitBounds(bounds, { padding: 48, maxZoom: MAX_FIT_ZOOM });
  }, [places]);

  // Centre on a result that was picked from the list, so the two views stay
  // in step.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedKey) return;

    const selected = places.find((place) => placeKey(place) === selectedKey);
    if (!selected) return;

    map.easeTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.getZoom(), PLACE_ZOOM),
    });
    // `places` is deliberately left out: a new search resets the selection, so
    // reacting to it as well would only fight the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200"
    />
  );
}
