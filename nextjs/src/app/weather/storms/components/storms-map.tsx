"use client";

import { useEffect, useRef, useState } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
import {
  categoryMeta,
  formatPressure,
  formatSpeed,
  formatTimestamp,
  latestPoint,
  splitTrack,
  unwrapLongitudes,
  type SpeedUnit,
  type Storm,
  type TrackPoint,
} from "../utils";

/**
 * The globe: every active storm with its track, its forecast cone and a label
 * where it is now. Hover a point of a track for the readings at that moment,
 * click a storm to select it.
 *
 * The cones, the tracks and the track points are GeoJSON sources with a layer
 * each, styled by their own properties, so the category decides the colour in
 * one place. The labels are DOM markers instead: there are only ever a
 * handful, and MapLibre ships without the fonts a text layer would need.
 *
 * MapLibre is not React-aware, so the map lives in a ref and the props are
 * pushed into it from effects.
 */

/**
 * MapLibre ships without a basemap, so this is the smallest style that shows
 * one: raster tiles straight from OpenStreetMap, on a globe, because storms
 * happen on every ocean at once and a flat map stretches the ones nearest the
 * poles. Swap the source for your own tile server (or any style URL) in
 * production, as the OSM tiles are meant for light use only.
 */
const MAP_STYLE: StyleSpecification = {
  version: 8,
  projection: { type: "globe" },
  // The atmosphere around the planet, faded out as the horizon leaves the
  // screen.
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
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** Far enough out to see a whole ocean around the storm the page opens on. */
const INITIAL_ZOOM = 1.6;
const FIT_OPTIONS = { padding: 80, maxZoom: 6, duration: 800 };

const CONE_SOURCE = "storm-cones";
const TRACK_SOURCE = "storm-tracks";
const POINT_SOURCE = "storm-points";

const CONE_FILL_LAYER = "storm-cones-fill";
const CONE_LINE_LAYER = "storm-cones-line";
const OBSERVED_LAYER = "storm-tracks-observed";
const FORECAST_LAYER = "storm-tracks-forecast";
const POINT_LAYER = "storm-points";

/** The track of a storm, unwrapped across the date line. */
function trackCoordinates(points: TrackPoint[]): [number, number][] {
  return unwrapLongitudes(
    points.map((point) => [point.longitude, point.latitude]),
  );
}

/**
 * Where the storm is now, on the same copy of the world as its track, so the
 * label sits on the line rather than a world away from it.
 */
function currentPosition(storm: Storm, now: number): [number, number] {
  const track = trackCoordinates(storm.path);
  return track[storm.path.indexOf(latestPoint(storm, now))];
}

/**
 * The cones, one polygon per ring, brought onto the same copy of the world as
 * the end of the track they continue from.
 */
function coneFeatures(storms: Storm[]) {
  return {
    type: "FeatureCollection" as const,
    features: storms.flatMap((storm) => {
      const track = trackCoordinates(storm.path);
      const end = track[track.length - 1][0];
      return storm.cone.map((ring) => ({
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [unwrapLongitudes(ring, end)],
        },
        properties: {
          id: storm.id,
          color: categoryMeta(storm.category).color,
        },
      }));
    }),
  };
}

/**
 * The tracks, one short line per leg between two positions, so each leg can
 * take the colour of the category the storm had reached at its end and the
 * line shows it strengthen and weaken. Legs that end after `now` are forecast
 * and drawn dashed.
 */
function trackFeatures(storms: Storm[], now: number) {
  return {
    type: "FeatureCollection" as const,
    features: storms.flatMap((storm) => {
      const coordinates = trackCoordinates(storm.path);
      const { forecast } = splitTrack(storm, now);
      const forecastFrom = storm.path.length - forecast.length;

      return storm.path.slice(1).map((point, index) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [coordinates[index], coordinates[index + 1]],
        },
        properties: {
          id: storm.id,
          color: categoryMeta(point.category).color,
          forecast: index + 1 > forecastFrom,
        },
      }));
    }),
  };
}

/** Every position along every track, for the dots and their tooltips. */
function pointFeatures(storms: Storm[]) {
  return {
    type: "FeatureCollection" as const,
    features: storms.flatMap((storm) => {
      const coordinates = trackCoordinates(storm.path);
      return storm.path.map((point, index) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: coordinates[index] },
        properties: {
          id: storm.id,
          index,
          color: categoryMeta(point.category).color,
        },
      }));
    }),
  };
}

/**
 * Expression that gives the selected storm a different value than the rest.
 * With no selection, everything gets the selected value.
 */
function whenSelected(
  selectedId: string | null,
  selected: number,
  rest: number,
): ExpressionSpecification | number {
  if (!selectedId) return selected;
  return ["case", ["==", ["get", "id"], selectedId], selected, rest];
}

interface StormsMapProps {
  storms: Storm[];
  /** When the storms were loaded, which decides what counts as forecast. */
  now: number;
  selectedId: string | null;
  unit: SpeedUnit;
  onSelect(id: string): void;
}

export default function StormsMap({
  storms,
  now,
  selectedId,
  unit,
  onSelect,
}: StormsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const stormsRef = useRef(storms);
  const nowRef = useRef(now);
  const unitRef = useRef(unit);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    stormsRef.current = storms;
    nowRef.current = now;
    unitRef.current = unit;
    onSelectRef.current = onSelect;
  }, [storms, now, unit, onSelect]);

  // The storm the page opens on is centred without moving the camera, so the
  // first selection is not a flight. Every later one is.
  const initialIdRef = useRef(selectedId);

  useEffect(() => {
    if (!containerRef.current) return;

    const opening = stormsRef.current.find(
      (storm) => storm.id === initialIdRef.current,
    );
    const center: [number, number] = opening
      ? currentPosition(opening, nowRef.current)
      : [100, 10];

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: INITIAL_ZOOM,
    });
    map.addControl(new NavigationControl(), "top-right");

    const tooltip = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
      maxWidth: "260px",
    });

    map.on("load", () => {
      map.addSource(CONE_SOURCE, { type: "geojson", data: coneFeatures([]) });
      map.addSource(TRACK_SOURCE, {
        type: "geojson",
        data: trackFeatures([], 0),
      });
      map.addSource(POINT_SOURCE, { type: "geojson", data: pointFeatures([]) });

      map.addLayer({
        id: CONE_FILL_LAYER,
        type: "fill",
        source: CONE_SOURCE,
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: CONE_LINE_LAYER,
        type: "line",
        source: CONE_SOURCE,
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.8,
        },
      });
      // The dash pattern cannot follow a feature property, so the forecast
      // legs get a layer of their own.
      for (const [id, forecast] of [
        [OBSERVED_LAYER, false],
        [FORECAST_LAYER, true],
      ] as const) {
        map.addLayer({
          id,
          type: "line",
          source: TRACK_SOURCE,
          filter: ["==", ["get", "forecast"], forecast],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["get", "color"],
            "line-width": 3,
            ...(forecast && { "line-dasharray": [2, 1.5] }),
          },
        });
      }
      map.addLayer({
        id: POINT_LAYER,
        type: "circle",
        source: POINT_SOURCE,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 4,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      const select = (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      };
      for (const layer of [CONE_FILL_LAYER, OBSERVED_LAYER, FORECAST_LAYER]) {
        map.on("click", layer, select);
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // Each dot is one advisory, so hovering one shows what the storm was
      // like at that moment.
      map.on("click", POINT_LAYER, select);
      map.on("mousemove", POINT_LAYER, (event) => {
        const properties = event.features?.[0]?.properties;
        const storm = stormsRef.current.find(
          (item) => item.id === properties?.id,
        );
        const point = storm?.path[Number(properties?.index)];
        if (!point) return;

        map.getCanvas().style.cursor = "pointer";
        tooltip
          .setLngLat(event.lngLat)
          .setDOMContent(tooltipContent(point, unitRef.current))
          .addTo(map);
        // The tooltip sits under the cursor, so it has to let the clicks and
        // moves meant for the dot below it through.
        tooltip.getElement().style.pointerEvents = "none";
      });
      map.on("mouseleave", POINT_LAYER, () => {
        map.getCanvas().style.cursor = "";
        tooltip.remove();
      });

      setReady(true);
    });

    mapRef.current = map;
    return () => {
      tooltip.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Push new data into the sources instead of rebuilding the map, so a reload
  // leaves the pan and zoom the user set alone.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const set = (id: string, data: GeoJSON.FeatureCollection) =>
      (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
    set(CONE_SOURCE, coneFeatures(storms));
    set(TRACK_SOURCE, trackFeatures(storms, now));
    set(POINT_SOURCE, pointFeatures(storms));
  }, [storms, now, ready]);

  // Fade the storms that are not selected, so the selected one reads as a
  // whole, and fly to it when the selection changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    map.setPaintProperty(
      CONE_FILL_LAYER,
      "fill-opacity",
      whenSelected(selectedId, 0.25, 0.08),
    );
    map.setPaintProperty(
      CONE_LINE_LAYER,
      "line-opacity",
      whenSelected(selectedId, 0.9, 0.3),
    );
    for (const layer of [OBSERVED_LAYER, FORECAST_LAYER]) {
      map.setPaintProperty(
        layer,
        "line-opacity",
        whenSelected(selectedId, 1, 0.4),
      );
    }
    map.setPaintProperty(
      POINT_LAYER,
      "circle-opacity",
      whenSelected(selectedId, 1, 0.4),
    );
    map.setPaintProperty(
      POINT_LAYER,
      "circle-stroke-opacity",
      whenSelected(selectedId, 1, 0.4),
    );

    if (selectedId === initialIdRef.current) return;
    initialIdRef.current = null;
    const selected = storms.find((storm) => storm.id === selectedId);
    if (selected) map.fitBounds(boundsOf(selected), FIT_OPTIONS);
  }, [selectedId, storms, ready]);

  // A label where each storm is now. There are few enough that replacing all
  // of them is cheaper than working out which one changed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current = storms.map((storm) => {
      const element = labelElement(storm, storm.id === selectedId);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(storm.id);
      });

      // Anchored on the left edge, then shifted back by half the dot, so the
      // dot rather than the label sits on the position.
      return new Marker({ element, anchor: "left", offset: [-8, 0] })
        .setLngLat(currentPosition(storm, now))
        .addTo(map);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [storms, now, selectedId]);

  return (
    <div
      ref={containerRef}
      className="h-[520px] w-full overflow-hidden rounded-lg border border-cloud-dark bg-white"
    />
  );
}

/**
 * The label on the current position: a dot in the colour of the category and
 * the short name beside it. Built as DOM rather than as an HTML string, which
 * keeps the name from the API text instead of markup.
 */
function labelElement(storm: Storm, selected: boolean): HTMLElement {
  const meta = categoryMeta(storm.category);

  const element = document.createElement("button");
  element.type = "button";
  element.title = storm.name;
  element.className = `flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs font-semibold shadow ${
    selected ? "bg-dark text-white" : "bg-white/90 text-dark"
  }`;

  const dot = document.createElement("span");
  dot.className = "block size-3 rounded-full border-2 border-white";
  dot.style.backgroundColor = meta.color;
  dot.style.boxShadow = `0 0 0 1px ${meta.color}`;

  const name = document.createElement("span");
  name.textContent = storm.nameShort;

  element.append(dot, name);
  return element;
}

/** What the tooltip shows for one position along a track. */
function tooltipContent(point: TrackPoint, unit: SpeedUnit): HTMLElement {
  const meta = categoryMeta(point.category);

  const root = document.createElement("div");
  root.className = "space-y-1";

  const header = document.createElement("div");
  header.className = "flex items-center gap-2";

  const pill = document.createElement("span");
  pill.className = "rounded px-1.5 py-0.5 text-xs font-semibold";
  pill.style.backgroundColor = meta.color;
  pill.style.color = meta.textColor;
  pill.textContent = point.category;

  const name = document.createElement("span");
  name.className = "text-sm font-medium text-dark";
  name.textContent = point.name;
  header.append(pill, name);

  const when = document.createElement("p");
  when.className = "text-xs text-dark/70";
  when.textContent = formatTimestamp(point.timestamp);

  const facts = document.createElement("p");
  facts.className = "text-xs text-dark/80";
  facts.textContent = [
    `Wind ${formatSpeed(point.windSpeed, unit)}`,
    `gusts ${formatSpeed(point.gustSpeed, unit)}`,
    formatPressure(point.pressure),
  ].join(" · ");

  root.append(header, when, facts);
  return root;
}

/** The area the track and the cone of a storm cover, to zoom to. */
function boundsOf(storm: Storm): LngLatBounds {
  const track = trackCoordinates(storm.path);
  const end = track[track.length - 1][0];
  const cone = storm.cone.flatMap((ring) => unwrapLongitudes(ring, end));

  return [...track, ...cone].reduce(
    (bounds, position) => bounds.extend(position),
    new LngLatBounds(track[0], track[0]),
  );
}
