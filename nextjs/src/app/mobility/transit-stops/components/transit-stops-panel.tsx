"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import {
  DEFAULT_LOCATION,
  distanceMeters,
  formatDistance,
  sortByDistance,
  stopLabel,
  type Departure,
  type LatLon,
  type StopPlace,
} from "../utils";
import { DeparturesList } from "./departures-list";

/**
 * Ties the example together: a picked location drives the stop list, and a
 * picked stop drives the departure list. Both API calls go through the route
 * handlers next to this component so the API key stays on the server.
 *
 * The stops for the default location are fetched on the server and handed in
 * as props, so the page has content on first paint and the browser only
 * fetches in response to a click.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const StopsMap = dynamic(() => import("./stops-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
  ),
});

interface TransitStopsPanelProps {
  initialStops: StopPlace[];
  initialError: string | null;
}

export function TransitStopsPanel({
  initialStops,
  initialError,
}: TransitStopsPanelProps) {
  const [picked, setPicked] = useState<LatLon>(DEFAULT_LOCATION);
  const [stops, setStops] = useState<StopPlace[]>(initialStops);
  const [stopsError, setStopsError] = useState<string | null>(initialError);
  const [loadingStops, setLoadingStops] = useState(false);

  const [selectedStop, setSelectedStop] = useState<StopPlace | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [departuresError, setDeparturesError] = useState<string | null>(null);
  const [loadingDepartures, setLoadingDepartures] = useState(false);

  // Aborting the previous request means a quick second click cannot be
  // overtaken by the response to the first one.
  const stopsRequest = useRef<AbortController | null>(null);
  const departuresRequest = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      stopsRequest.current?.abort();
      departuresRequest.current?.abort();
    },
    [],
  );

  async function pickLocation(location: LatLon) {
    stopsRequest.current?.abort();
    departuresRequest.current?.abort();
    const controller = new AbortController();
    stopsRequest.current = controller;

    setPicked(location);
    setStopsError(null);
    setLoadingStops(true);
    setSelectedStop(null);
    setDepartures([]);
    setDeparturesError(null);
    setLoadingDepartures(false);

    try {
      const body = await fetchJson<{ stopplaces?: StopPlace[] }>(
        `/mobility/transit-stops/nearby?lat=${location.latitude}&lon=${location.longitude}`,
        controller.signal,
      );
      setStops(sortByDistance(body.stopplaces ?? [], location));
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setStops([]);
      setStopsError(
        error instanceof Error ? error.message : "Failed to load stops.",
      );
    } finally {
      if (!controller.signal.aborted) setLoadingStops(false);
    }
  }

  async function selectStop(stop: StopPlace) {
    departuresRequest.current?.abort();
    const controller = new AbortController();
    departuresRequest.current = controller;

    setSelectedStop(stop);
    setDepartures([]);
    setDeparturesError(null);
    setLoadingDepartures(true);

    try {
      const body = await fetchJson<{ departures?: Departure[] }>(
        `/mobility/transit-stops/departures?stopplace_id=${encodeURIComponent(stop.id)}`,
        controller.signal,
      );
      setDepartures(body.departures ?? []);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setDeparturesError(
        error instanceof Error ? error.message : "Failed to load departures.",
      );
    } finally {
      if (!controller.signal.aborted) setLoadingDepartures(false);
    }
  }

  return (
    <div className="space-y-6">
      <StopsMap
        picked={picked}
        stops={stops}
        selectedStopId={selectedStop?.id ?? null}
        onPick={pickLocation}
        onSelectStop={selectStop}
      />

      <p className="text-xs text-dark/70">
        Click the map or drag the pin to move the search. Picked location:{" "}
        <span className="tabular-nums">
          {picked.latitude.toFixed(5)}, {picked.longitude.toFixed(5)}
        </span>
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="self-start rounded-lg border border-cloud-dark bg-white p-5">
          <h2 className="text-sm font-medium text-dark">
            Nearby stops
            {stops.length > 0 && (
              <span className="ml-2 font-normal text-dark/50">
                {stops.length}
              </span>
            )}
          </h2>

          {loadingStops && (
            <p className="mt-3 text-sm text-dark/70">Loading stops…</p>
          )}
          {stopsError && (
            <p className="mt-3 text-sm text-red-600">{stopsError}</p>
          )}
          {!loadingStops && !stopsError && stops.length === 0 && (
            <p className="mt-3 text-sm text-dark/70">
              No stops here. Try a spot closer to a town.
            </p>
          )}

          {!loadingStops && (
            <ul className="mt-2 divide-y divide-cloud">
              {stops.map((stop) => {
                const isSelected = stop.id === selectedStop?.id;
                return (
                  <li key={stop.id}>
                    <button
                      type="button"
                      onClick={() => selectStop(stop)}
                      className={`flex w-full items-center gap-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "text-marine"
                          : "text-dark hover:text-dark/70"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {stopLabel(stop)}
                        </span>
                        <span className="block truncate text-xs text-dark/50">
                          {stop.id}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-dark/70">
                        {formatDistance(distanceMeters(picked, stop))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="self-start rounded-lg border border-cloud-dark bg-white p-5">
          <h2 className="text-sm font-medium text-dark">
            {selectedStop ? stopLabel(selectedStop) : "Departures"}
          </h2>

          {!selectedStop && (
            <p className="mt-3 text-sm text-dark/70">
              Pick a stop from the list or the map to see its departures.
            </p>
          )}
          {loadingDepartures && (
            <p className="mt-3 text-sm text-dark/70">Loading departures…</p>
          )}
          {departuresError && (
            <p className="mt-3 text-sm text-red-600">{departuresError}</p>
          )}
          {selectedStop &&
            !loadingDepartures &&
            !departuresError &&
            departures.length === 0 && (
              <p className="mt-3 text-sm text-dark/70">
                Nothing departs from this stop in the next hour.
              </p>
            )}

          {departures.length > 0 && !loadingDepartures && (
            <div className="mt-2">
              <DeparturesList departures={departures} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
