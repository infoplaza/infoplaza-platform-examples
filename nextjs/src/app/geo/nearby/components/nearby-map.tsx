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
import { placeKey, type LatLon, type NearbyPlace } from "../utils";

/**
 * The map: click anywhere to pick a location, click a dot to pick a place.
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

const INITIAL_ZOOM = 10;
/** The furthest places are tens of kilometres out, so results are zoomed to. */
const FIT_OPTIONS = { padding: 60, maxZoom: 12, duration: 600 };

const PIN_COLOR = "#111827";
const PLACE_COLOR = "#111827";
const SELECTED_PLACE_COLOR = "#2563eb";

interface NearbyMapProps {
  /** Where the search is centred, shown as a pin. */
  picked: LatLon;
  places: NearbyPlace[];
  selectedKey: string | null;
  onPick(location: LatLon): void;
  onSelectPlace(place: NearbyPlace): void;
}

export default function NearbyMap({
  picked,
  places,
  selectedKey,
  onPick,
  onSelectPlace,
}: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickedMarkerRef = useRef<Marker | null>(null);
  const placeMarkersRef = useRef<Marker[]>([]);
  /** Set while the pin itself moved the location, so the map stays put. */
  const skipRecenterRef = useRef(false);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const onPickRef = useRef(onPick);
  const onSelectPlaceRef = useRef(onSelectPlace);
  const pickedRef = useRef(picked);
  useEffect(() => {
    onPickRef.current = onPick;
    onSelectPlaceRef.current = onSelectPlace;
    pickedRef.current = picked;
  }, [onPick, onSelectPlace, picked]);

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
    // Markers stack in the order they are added, and the place dots are
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
      placeMarkersRef.current = [];
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

  // One dot per place. There are only a handful, so rebuilding them all when
  // the selection changes is simpler than diffing and fast enough.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of placeMarkersRef.current) marker.remove();
    placeMarkersRef.current = places.map((place) => {
      const selected = placeKey(place) === selectedKey;
      const element = document.createElement("button");
      element.type = "button";
      element.title = place.name;
      element.style.cssText = `
        width: ${selected ? 18 : 14}px;
        height: ${selected ? 18 : 14}px;
        border-radius: 9999px;
        border: 2px solid #ffffff;
        background: ${selected ? SELECTED_PLACE_COLOR : PLACE_COLOR};
        box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
        cursor: pointer;
        padding: 0;
      `;
      element.addEventListener("click", (event) => {
        // Without this the map's own click handler would move the pin.
        event.stopPropagation();
        onSelectPlaceRef.current(place);
      });

      return new Marker({ element })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
    });
  }, [places, selectedKey]);

  // Bring the whole result in view once it arrives. While a search is running
  // there are no places to frame, and moving the map then would only undo the
  // pan and zoom the user set.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || places.length === 0) return;

    const origin = pickedRef.current;
    const bounds = new LngLatBounds(
      [origin.longitude, origin.latitude],
      [origin.longitude, origin.latitude],
    );
    for (const place of places) bounds.extend([place.longitude, place.latitude]);
    map.fitBounds(bounds, FIT_OPTIONS);
  }, [places]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200"
    />
  );
}
