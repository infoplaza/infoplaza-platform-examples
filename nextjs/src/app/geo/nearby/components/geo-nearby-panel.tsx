"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import {
  countryFlag,
  DEFAULT_LOCATION,
  DEFAULT_RADIUS,
  distanceMeters,
  formatCoordinates,
  formatDistance,
  formatRadius,
  RADIUS_OPTIONS,
  type LatLon,
  type Place,
} from "../utils";

/**
 * Ties the example together: a picked location and a radius make one call,
 * and the place that comes back is drawn on the map and described beside it.
 *
 * The lookup goes through the route handler next to this component, so the API
 * key stays on the server. The place for the location and radius the page
 * opens on is fetched during server rendering and handed in as props, so the
 * page has content on first paint.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const NearbyMap = dynamic(() => import("./nearby-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
  ),
});

interface GeoNearbyPanelProps {
  initialPlace: Place | null;
  initialError: string | null;
}

export function GeoNearbyPanel({
  initialPlace,
  initialError,
}: GeoNearbyPanelProps) {
  const [picked, setPicked] = useState<LatLon>(DEFAULT_LOCATION);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [place, setPlace] = useState<Place | null>(initialPlace);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const radiusId = `${useId()}-radius`;

  // Aborting the previous request means a quick second click cannot be
  // overtaken by the response to the first one.
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  const lookup = useCallback(async (location: LatLon, meters: number) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setError(null);
    setLoading(true);
    setPlace(null);

    try {
      const body = await fetchJson<{ place?: Place | null }>(
        `/geo/nearby/place?lat=${location.latitude}&lon=${location.longitude}&radius=${meters}`,
        controller.signal,
      );
      setPlace(body.place ?? null);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setPlace(null);
      setError(
        error instanceof Error ? error.message : "Failed to load the place.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Both controls change one half of the same question, so either one asks it
  // again with the other half as it stands.
  function pickLocation(location: LatLon) {
    setPicked(location);
    lookup(location, radius);
  }

  function pickRadius(meters: number) {
    setRadius(meters);
    lookup(picked, meters);
  }

  return (
    <div className="space-y-6">
      <NearbyMap
        picked={picked}
        radius={radius}
        place={place}
        onPick={pickLocation}
      />

      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor={radiusId} className="text-gray-600">
          Radius
        </label>
        <select
          id={radiusId}
          value={radius}
          onChange={(event) => pickRadius(Number(event.target.value))}
          className="w-40 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          {RADIUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {formatRadius(option)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-500">
        Click the map or drag the pin to move the search. Picked location:{" "}
        <span className="tabular-nums">{formatCoordinates(picked)}</span>
      </p>

      <section className="max-w-md">
        <h2 className="text-sm font-medium text-gray-900">
          {place ? place.name : "Place"}
        </h2>

        {loading && (
          <p className="mt-3 text-sm text-gray-500">Looking around…</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {!loading && !error && !place && (
          <p className="mt-3 text-sm text-gray-500">
            No place within {formatRadius(radius)} of here. Widen the radius or
            try a spot closer to land.
          </p>
        )}

        {place && !loading && (
          <dl className="mt-2 divide-y divide-gray-100 text-sm">
            <Detail label="Country">
              <span aria-hidden className="mr-1.5">
                {countryFlag(place.country.code)}
              </span>
              {place.country.name} ({place.country.code})
            </Detail>
            <Detail label="Continent">{place.continent.name}</Detail>
            <Detail label="Timezone">{place.timezone}</Detail>
            <Detail label="Coordinates">
              <span className="font-mono text-xs">
                {formatCoordinates(place)}
              </span>
            </Detail>
            <Detail label="Distance">
              <span className="tabular-nums">
                {formatDistance(distanceMeters(picked, place))}
              </span>{" "}
              from the pin
            </Detail>
          </dl>
        )}
      </section>
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
