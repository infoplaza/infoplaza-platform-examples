"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
import { EARTH_RADIUS_METERS, type LatLon, type Place } from "../utils";

/**
 * The map: click anywhere to pick a location, and see the circle the API is
 * asked about with the place it answered with inside it.
 *
 * MapLibre is not React-aware, so the map, its markers and the circle are
 * created imperatively and kept in refs. Everything above this component works
 * with plain props and callbacks.
 */

/**
 * MapLibre ships without a basemap, so this is the smallest style that shows
 * one: raster tiles straight from OpenStreetMap. Swap the source for your own
 * tile server (or any style URL) in production: the OSM tiles are meant for
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
/** The widest circle is a hundred kilometres across, so the map is fitted. */
const FIT_OPTIONS = { padding: 60, maxZoom: 14, duration: 600 };

const AREA_SOURCE = "search-area";
const PIN_COLOR = "#2e2e2b";
const PLACE_COLOR = "#0070de";

/** How many points the circle is drawn with. Smooth enough at any radius. */
const RING_POINTS = 96;

/**
 * The circle of `radius` around `center` as GeoJSON, in the [lon, lat] order
 * MapLibre reads. A degree is worth less the further north it is, so the ring
 * is walked out along bearings on a sphere rather than as an offset in
 * degrees, which would draw an oval.
 */
function ringAround(center: LatLon, radius: number): [number, number][] {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;

  const latitude = toRadians(center.latitude);
  const longitude = toRadians(center.longitude);
  const angular = radius / EARTH_RADIUS_METERS;

  // One point more than there are steps: a polygon has to close on itself.
  return Array.from({ length: RING_POINTS + 1 }, (_, step) => {
    const bearing = (2 * Math.PI * step) / RING_POINTS;
    const pointLatitude = Math.asin(
      Math.sin(latitude) * Math.cos(angular) +
        Math.cos(latitude) * Math.sin(angular) * Math.cos(bearing),
    );
    const pointLongitude =
      longitude +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(latitude),
        Math.cos(angular) - Math.sin(latitude) * Math.sin(pointLatitude),
      );
    return [toDegrees(pointLongitude), toDegrees(pointLatitude)];
  });
}

function ringFeature(
  ring: [number, number][],
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

interface NearbyMapProps {
  /** Where the search is centred, shown as a pin. */
  picked: LatLon;
  /** How far around it the API is asked, drawn as a circle. */
  radius: number;
  /** What it answered with; null while loading and when nothing was found. */
  place: Place | null;
  onPick(location: LatLon): void;
}

export default function NearbyMap({
  picked,
  radius,
  place,
  onPick,
}: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickedMarkerRef = useRef<Marker | null>(null);
  const placeMarkerRef = useRef<Marker | null>(null);
  /** Set while the pin itself moved the location, so the map stays put. */
  const skipRecenterRef = useRef(false);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const onPickRef = useRef(onPick);
  const pickedRef = useRef(picked);
  const radiusRef = useRef(radius);
  useEffect(() => {
    onPickRef.current = onPick;
    pickedRef.current = picked;
    radiusRef.current = radius;
  }, [onPick, picked, radius]);

  // The map, its pin and its circle share one lifecycle: they are created here
  // and go away together, so a remount cannot leave any of them behind on a
  // map that no longer exists.
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

    // Sources and layers can only be added once the style is up. By then the
    // props may have moved on, hence the refs.
    map.on("load", () => {
      map.addSource(AREA_SOURCE, {
        type: "geojson",
        data: ringFeature(ringAround(pickedRef.current, radiusRef.current)),
      });
      map.addLayer({
        id: `${AREA_SOURCE}-fill`,
        type: "fill",
        source: AREA_SOURCE,
        paint: { "fill-color": PLACE_COLOR, "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: `${AREA_SOURCE}-line`,
        type: "line",
        source: AREA_SOURCE,
        paint: {
          "line-color": PLACE_COLOR,
          "line-opacity": 0.5,
          "line-width": 1.5,
        },
      });
    });

    const pin = new Marker({ color: PIN_COLOR, draggable: true })
      .setLngLat([start.longitude, start.latitude])
      .addTo(map);
    // Markers stack in the order they are added, and the place dot is rebuilt
    // after this one. Lift the pin out of that order so it stays on top, both
    // to see it and to keep it grabbable.
    pin.getElement().style.zIndex = "1";
    pin.on("dragend", () => {
      const { lat, lng } = pin.getLngLat();
      // The pin is already where it was dropped; refitting the map on it now
      // would pull the ground out from under the cursor.
      skipRecenterRef.current = true;
      onPickRef.current({ latitude: lat, longitude: lng });
    });

    mapRef.current = map;
    pickedMarkerRef.current = pin;
    return () => {
      map.remove();
      mapRef.current = null;
      pickedMarkerRef.current = null;
      placeMarkerRef.current = null;
    };
  }, []);

  // Keep the pin and the circle on the search as it stands, and frame the
  // circle, unless the pin is what moved the search in the first place.
  useEffect(() => {
    const map = mapRef.current;
    const pin = pickedMarkerRef.current;
    if (!map || !pin) return;

    pin.setLngLat([picked.longitude, picked.latitude]);

    const ring = ringAround(picked, radius);
    const source = map.getSource(AREA_SOURCE) as GeoJSONSource | undefined;
    source?.setData(ringFeature(ring));

    if (skipRecenterRef.current) {
      skipRecenterRef.current = false;
      return;
    }
    const bounds = new LngLatBounds(ring[0], ring[0]);
    for (const point of ring) bounds.extend(point);
    map.fitBounds(bounds, FIT_OPTIONS);
  }, [picked, radius]);

  // One dot for the answer. It ignores the mouse, so a click on it lands on
  // the map below and moves the search there like any other click.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    placeMarkerRef.current?.remove();
    placeMarkerRef.current = null;
    if (!place) return;

    const element = document.createElement("div");
    element.title = place.name;
    element.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 9999px;
      border: 2px solid #ffffff;
      background: ${PLACE_COLOR};
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
      pointer-events: none;
    `;

    placeMarkerRef.current = new Marker({ element })
      .setLngLat([place.longitude, place.latitude])
      .addTo(map);
  }, [place]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-lg border border-cloud-dark bg-white"
    />
  );
}
