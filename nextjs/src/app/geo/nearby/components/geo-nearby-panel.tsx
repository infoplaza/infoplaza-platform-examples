"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  countryFlag,
  DEFAULT_LOCATION,
  distanceMeters,
  formatCoordinates,
  formatDistance,
  formatRadius,
  MAX_RADIUS,
  placeKey,
  SEARCH_RADII,
  type LatLon,
  type NearbyPlace,
} from "../utils";
import { PlaceList } from "./place-list";

/**
 * Ties the example together: a picked location fills the list of places and
 * the dots on the map, and picking a place in either view shows what the API
 * returned for it.
 *
 * The lookup goes through the route handler next to this component, so the API
 * key stays on the server. The places for the location the page opens on are
 * fetched during server rendering and handed in as props, so the page has
 * content on first paint.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const NearbyMap = dynamic(() => import("./nearby-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
  ),
});

interface GeoNearbyPanelProps {
  initialPlaces: NearbyPlace[];
  initialError: string | null;
}

export function GeoNearbyPanel({
  initialPlaces,
  initialError,
}: GeoNearbyPanelProps) {
  const [picked, setPicked] = useState<LatLon>(DEFAULT_LOCATION);
  const [places, setPlaces] = useState<NearbyPlace[]>(initialPlaces);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  // The nearest place is what the point is in, so it opens selected.
  const [selected, setSelected] = useState<NearbyPlace | null>(
    initialPlaces[0] ?? null,
  );

  // Aborting the previous request means a quick second click cannot be
  // overtaken by the response to the first one.
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  async function pickLocation(location: LatLon) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setPicked(location);
    setError(null);
    setLoading(true);
    setPlaces([]);
    setSelected(null);

    try {
      const response = await fetch(
        `/geo/nearby/places?lat=${location.latitude}&lon=${location.longitude}`,
        { signal: controller.signal },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Request failed.");

      const found: NearbyPlace[] = body.places ?? [];
      setPlaces(found);
      setSelected(found[0] ?? null);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setPlaces([]);
      setError(
        error instanceof Error ? error.message : "Failed to load places.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const selectedKey = selected ? placeKey(selected) : null;

  return (
    <div className="space-y-6">
      <NearbyMap
        picked={picked}
        places={places}
        selectedKey={selectedKey}
        onPick={pickLocation}
        onSelectPlace={setSelected}
      />

      <p className="text-xs text-gray-500">
        Click the map or drag the pin to move the search. Picked location:{" "}
        <span className="tabular-nums">{formatCoordinates(picked)}</span>
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-medium text-gray-900">
            Nearby places
            {places.length > 0 && (
              <span className="ml-2 font-normal text-gray-400">
                {places.length}
              </span>
            )}
          </h2>

          {loading && (
            <p className="mt-3 text-sm text-gray-500">
              Looking around, {SEARCH_RADII.length} radii…
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {!loading && !error && places.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">
              No place within {formatRadius(MAX_RADIUS)} of here. Try a spot
              closer to land.
            </p>
          )}

          {places.length > 0 && !loading && (
            <div className="mt-2">
              <PlaceList
                places={places}
                origin={picked}
                selectedKey={selectedKey}
                onSelect={setSelected}
              />
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-gray-900">
            {selected ? selected.name : "Place"}
          </h2>

          {!selected ? (
            <p className="mt-3 text-sm text-gray-500">
              Pick a place from the list or the map to see what the API returned
              for it.
            </p>
          ) : (
            <dl className="mt-2 divide-y divide-gray-100 text-sm">
              <Detail label="Country">
                <span aria-hidden className="mr-1.5">
                  {countryFlag(selected.country.code)}
                </span>
                {selected.country.name} ({selected.country.code})
              </Detail>
              <Detail label="Continent">{selected.continent.name}</Detail>
              <Detail label="Timezone">{selected.timezone}</Detail>
              <Detail label="Coordinates">
                <span className="font-mono text-xs">
                  {formatCoordinates(selected)}
                </span>
              </Detail>
              <Detail label="Distance">
                <span className="tabular-nums">
                  {formatDistance(distanceMeters(picked, selected))}
                </span>{" "}
                from the pin
              </Detail>
              <Detail label="Found at radius">
                <span className="tabular-nums">
                  {formatRadius(selected.radius)}
                </span>
              </Detail>
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}

/** One row of the detail list: label on the left, value on the right. */
function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right text-gray-900">{children}</dd>
    </div>
  );
}
