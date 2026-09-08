"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  type DataDrivenPropertyValueSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// Sets the MapLibre worker URL, which every map on the page shares.
import "@/lib/maplibre";
import { sizeLabel, type Port, type PortSize } from "../utils";

/**
 * The map: every port in the filter as a dot, click one to make it active.
 *
 * The ports are a GeoJSON source with a circle layer on top rather than one
 * DOM marker each, because the filter goes up to 3,700 of them and that many
 * elements would make panning crawl. It also makes the click handling and the
 * highlight one line apiece: MapLibre reports which feature was hit, and the
 * active port is a second layer filtered down to its id.
 *
 * MapLibre is not React-aware, so the map is created imperatively and kept in
 * a ref. Everything above this component works with plain props and
 * callbacks.
 */

/** From here in, the seamark overlay has marks to draw. */
const SEAMARK_MIN_ZOOM = 9;

/**
 * OpenSeaMap draws the sea, not the land: its tiles are a transparent overlay
 * of buoys, beacons, lights and harbour marks that expects a basemap under
 * it. So the style is two raster sources — OpenStreetMap underneath for the
 * coastline and the towns, the OpenSeaMap seamarks on top.
 *
 * Both are the projects' own tile servers, meant for light use. Swap them for
 * your own tile server (or any style URL) in production.
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
    seamark: {
      type: "raster",
      tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 18,
      attribution:
        '© <a href="https://www.openseamap.org/">OpenSeaMap</a> contributors',
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
    // The seamark tiles are empty above the whole-country zooms, so they are
    // only asked for once zooming in can actually show something.
    {
      id: "seamark",
      type: "raster",
      source: "seamark",
      minzoom: SEAMARK_MIN_ZOOM,
    },
  ],
};

/** Opens on the North Sea: busy with ports, and charted in detail. */
const INITIAL_CENTER: [number, number] = [4.48, 51.9];
const INITIAL_ZOOM = 5;

/** How far to zoom in when a port is picked from outside the map. */
const PORT_ZOOM = 11;

const PORTS_SOURCE = "ports";
const PORTS_LAYER = "ports-circles";
const ACTIVE_LAYER = "ports-active";

const PORT_COLOR = "#111827";
const ACTIVE_COLOR = "#2563eb";

/** Dot size per grade, so the big ports read as the big ones. */
const RADIUS_BY_SIZE: Record<PortSize, number> = {
  large: 6.5,
  medium: 5,
  small: 4,
  very_small: 3,
};

interface PortsMapProps {
  ports: Port[];
  activeId: number | null;
  onSelect(portId: number): void;
}

export default function PortsMap({ ports, activeId, onSelect }: PortsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  /** The layers only exist once the style has loaded, so the data effects wait. */
  const [ready, setReady] = useState(false);

  // The map is built once, so anything it closes over has to be read from a
  // ref or it would be stuck with the values of the first render.
  const onSelectRef = useRef(onSelect);
  const portsRef = useRef(ports);
  useEffect(() => {
    onSelectRef.current = onSelect;
    portsRef.current = ports;
  }, [onSelect, ports]);

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
      offset: 12,
    });

    // `style.load`, not `load`: MapLibre only fires `load` once every source
    // has settled, which for this style means every OpenStreetMap tile in the
    // opening view has come back. Those tiles are rate limited, so one slow
    // request would hold the ports off the map, and a request that never
    // settles would keep them off it altogether. `style.load` fires as soon as
    // the style is parsed, which is all that adding a source and its layers
    // needs.
    map.on("style.load", () => {
      map.addSource(PORTS_SOURCE, {
        type: "geojson",
        data: toFeatureCollection(portsRef.current),
      });

      map.addLayer({
        id: PORTS_LAYER,
        type: "circle",
        source: PORTS_SOURCE,
        paint: {
          "circle-color": PORT_COLOR,
          "circle-radius": radiusExpression(0),
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      // The active port is the same dot drawn again on top, a size larger and
      // in colour. Filtering a layer down to one id is cheaper than rewriting
      // the source every time the selection moves.
      map.addLayer({
        id: ACTIVE_LAYER,
        type: "circle",
        source: PORTS_SOURCE,
        filter: activeFilter(null),
        paint: {
          "circle-color": ACTIVE_COLOR,
          "circle-radius": radiusExpression(3),
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });

      map.on("click", PORTS_LAYER, (event) => {
        const feature = event.features?.[0];
        if (feature) onSelectRef.current(Number(feature.properties.id));
      });

      map.on("mousemove", PORTS_LAYER, (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        map.getCanvas().style.cursor = "pointer";
        hover.setLngLat(event.lngLat).setHTML(hoverLabel(feature)).addTo(map);
      });
      map.on("mouseleave", PORTS_LAYER, () => {
        map.getCanvas().style.cursor = "";
        hover.remove();
      });

      setReady(true);
    });

    mapRef.current = map;
    return () => {
      hover.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Changing the size filter replaces the whole set of dots.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const source = map.getSource(PORTS_SOURCE) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(ports));
  }, [ports, ready]);

  // Highlight the active port, and bring it into view when it is off screen —
  // which it is when the page opens on one, and after a filter change moved
  // the map nowhere near it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    map.setFilter(ACTIVE_LAYER, activeFilter(activeId));
    if (activeId === null) return;

    const active = ports.find((port) => port.id === activeId);
    if (!active) return;

    const position: [number, number] = [active.longitude, active.latitude];
    if (map.getBounds().contains(position)) return;
    map.easeTo({ center: position, zoom: Math.max(map.getZoom(), PORT_ZOOM) });
  }, [activeId, ports, ready]);

  return (
    <div
      ref={containerRef}
      className="h-[480px] w-full overflow-hidden rounded-lg border border-gray-200"
    />
  );
}

/** The ports as map features, carrying what the layers and popup need. */
function toFeatureCollection(
  ports: Port[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: ports.map((port) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [port.longitude, port.latitude] },
      properties: {
        id: port.id,
        name: port.name,
        country: port.country,
        size: port.size,
      },
    })),
  };
}

/** Circle radius per size grade, optionally grown for the active dot. */
function radiusExpression(
  extra: number,
): DataDrivenPropertyValueSpecification<number> {
  return [
    "match",
    ["get", "size"],
    "large",
    RADIUS_BY_SIZE.large + extra,
    "medium",
    RADIUS_BY_SIZE.medium + extra,
    "small",
    RADIUS_BY_SIZE.small + extra,
    // The smallest grade doubles as the fallback for anything unrecognised.
    RADIUS_BY_SIZE.very_small + extra,
  ];
}

/** Matches the active port, or nothing at all when there is none. */
function activeFilter(activeId: number | null): FilterSpecification {
  return ["==", ["get", "id"], activeId ?? -1];
}

/** "Rotterdam · Netherlands · Large" */
function hoverLabel(feature: MapGeoJSONFeature): string {
  const { name, country, size } = feature.properties;
  const text = [name, country, sizeLabel(size as PortSize)]
    .filter(Boolean)
    .join(" · ");
  // Port names come from the API, so they are escaped before going into HTML.
  return `<span style="font: 500 12px/1.4 system-ui, sans-serif">${escapeHtml(text)}</span>`;
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
