"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson, RouteError } from "@/lib/api-log";
import {
  DEFAULT_GRANULARITY,
  DEFAULT_LOCATION,
  formatCoordinates,
  formatTemperature,
  GRANULARITIES,
  periodLabel,
  summarize,
  type Climate,
  type Granularity,
  type LatLon,
} from "../utils";
import { ClimateChart } from "./climate-chart";
import { ClimateTable } from "./climate-table";

/**
 * Ties the example together: the location picked on the map and the
 * granularity chosen below it decide which climate year is shown, in the
 * summary tiles, the four charts and the table.
 *
 * The lookup goes through the route handler in ../normals, so the API key
 * stays on the server. The climate for the location the page opens on is
 * fetched during server rendering and handed in as a prop, so the page has
 * content on first paint.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const ClimateMap = dynamic(() => import("./climate-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
  ),
});

interface ClimatePanelProps {
  initialClimate: Climate | null;
  initialError: string | null;
}

export function ClimatePanel({
  initialClimate,
  initialError,
}: ClimatePanelProps) {
  const [picked, setPicked] = useState<LatLon>(DEFAULT_LOCATION);
  const [granularity, setGranularity] = useState<Granularity>(
    DEFAULT_GRANULARITY,
  );
  const [climate, setClimate] = useState<Climate | null>(initialClimate);
  const [error, setError] = useState<string | null>(initialError);
  /** Set when the API simply has no data here, which is not a failure. */
  const [uncovered, setUncovered] = useState(false);
  const [loading, setLoading] = useState(false);

  // Aborting the previous request means a quick second click cannot be
  // overtaken by the response to the first one.
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  async function load(location: LatLon, period: Granularity) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setPicked(location);
    setGranularity(period);
    setError(null);
    setUncovered(false);
    setLoading(true);

    try {
      const body = await fetchJson<{ climate: Climate }>(
        `/weather/climate/normals?lat=${location.latitude}&lon=${location.longitude}&period=${period}`,
        controller.signal,
      );
      setClimate(body.climate);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setClimate(null);
      // A location the API has no climate year for is not a failure of the
      // example, so the route marks it and the panel says so in its own words.
      if (error instanceof RouteError) setUncovered(error.body.covered === false);
      setError(
        error instanceof Error ? error.message : "Failed to load climate data.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const summary = climate ? summarize(climate.periods, granularity) : null;

  return (
    <div className="space-y-6">
      <ClimateMap
        picked={picked}
        onPick={(location) => load(location, granularity)}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-dark/70">
          Click the map or drag the marker to move the location. Picked
          location:{" "}
          <span className="tabular-nums">{formatCoordinates(picked)}</span>
        </p>

        <div
          className="flex rounded-md border border-cloud-dark bg-white p-0.5"
          role="group"
          aria-label="Granularity"
        >
          {GRANULARITIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => load(picked, option.value)}
              aria-pressed={option.value === granularity}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                option.value === granularity
                  ? "bg-dark text-white"
                  : "text-dark/80 hover:bg-cloud"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {uncovered && (
        <p className="text-sm text-dark/70">
          The API has no climate data for this location. Coverage has gaps: the
          open ocean and parts of the tropics and the Sahara come back empty,
          so try a spot nearby or somewhere else on land.
        </p>
      )}
      {error && !uncovered && <p className="text-sm text-red-600">{error}</p>}

      {climate && summary && (
        <div
          className={`space-y-8 transition-opacity ${loading ? "opacity-50" : ""}`}
          aria-busy={loading}
        >
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-cloud-dark bg-cloud-dark lg:grid-cols-5">
            <Tile
              label="Average temperature"
              value={formatTemperature(summary.temperature)}
              detail="mean over the year"
            />
            <Tile
              label="Warmest"
              value={periodLabel(summary.warmest, granularity)}
              detail={`${formatTemperature(summary.warmest.temperatureHigh)} average high`}
            />
            <Tile
              label="Coldest"
              value={periodLabel(summary.coldest, granularity)}
              detail={`${formatTemperature(summary.coldest.temperatureLow)} average low`}
            />
            <Tile
              label="Precipitation"
              value={`${Math.round(summary.precipitation)} mm`}
              detail="over the year"
            />
            <Tile
              label="Sunshine"
              value={`${Math.round(summary.sunshine)} h`}
              detail="over the year"
            />
          </dl>

          <div className="grid gap-6 md:grid-cols-2">
            <ClimateChart
              periods={climate.periods}
              granularity={granularity}
              metric="temperature"
            />
            <ClimateChart
              periods={climate.periods}
              granularity={granularity}
              metric="precipitation"
            />
            <ClimateChart
              periods={climate.periods}
              granularity={granularity}
              metric="sunshine"
            />
            <ClimateChart
              periods={climate.periods}
              granularity={granularity}
              metric="wind"
            />
          </div>

          <section className="rounded-lg border border-cloud-dark bg-white p-5">
            <h2 className="text-sm font-medium text-dark">
              All periods
              <span className="ml-2 font-normal text-dark/50">
                {climate.periods.length}
              </span>
            </h2>
            <div className="mt-2">
              <ClimateTable
                periods={climate.periods}
                granularity={granularity}
              />
            </div>
          </section>
        </div>
      )}

      {!climate && loading && (
        <p className="text-sm text-dark/70">Loading the climate year…</p>
      )}
    </div>
  );
}

/** One summary tile: a number with what it stands for around it. */
function Tile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs text-dark/70">{label}</dt>
      <dd className="mt-1 truncate text-lg text-dark" title={value}>
        {value}
      </dd>
      <dd className="text-xs text-dark/50">{detail}</dd>
    </div>
  );
}
