"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import {
  BLOCKS,
  blockByName,
  DEFAULT_LOCATION,
  FORECAST_DEFAULTS,
  formatCoordinates,
  isDefaultSizes,
  type BlockName,
  type Forecast,
  type ForecastSizes,
  type LatLon,
} from "../utils";
import { CurrentConditions } from "./current-conditions";
import { DailyTable, DaypartTable, HourlyTable } from "./forecast-tables";
import { PrecipitationChart } from "./precipitation-chart";

/**
 * Ties the example together: a picked location fills the whole page below the
 * map, and the tabs switch between the four blocks the one call came back
 * with. The picker beside the tabs sets how much of the block on screen to
 * ask for, and since all four sizes ride on the same call, changing one asks
 * for the whole forecast again.
 *
 * The lookup goes through the route handler next to this component, so the
 * API key stays on the server. The forecast for the location the page opens
 * on is fetched during server rendering and handed in as a prop, so the page
 * has content on first paint.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const ForecastMap = dynamic(() => import("./forecast-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
  ),
});

interface ForecastPanelProps {
  initialForecast: Forecast | null;
  initialError: string | null;
}

export function ForecastPanel({
  initialForecast,
  initialError,
}: ForecastPanelProps) {
  const [picked, setPicked] = useState<LatLon>(DEFAULT_LOCATION);
  const [forecast, setForecast] = useState<Forecast | null>(initialForecast);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [block, setBlock] = useState<BlockName>("hourly");
  const [sizes, setSizes] = useState<ForecastSizes>(FORECAST_DEFAULTS);

  const sizeId = `${useId()}-size`;

  // Aborting the previous request means a quick second click cannot be
  // overtaken by the response to the first one.
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  // Both the map and the size picker end up here: either one asks for the
  // whole forecast again, because one call carries every block.
  async function load(location: LatLon, wanted: ForecastSizes) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setPicked(location);
    setSizes(wanted);
    setError(null);
    setLoading(true);

    const query = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      minutely: String(wanted.minutely),
      hourly: String(wanted.hourly),
      daypartly: String(wanted.daypartly),
      daily: String(wanted.daily),
    });

    try {
      const body = await fetchJson<{ forecast: Forecast }>(
        `/weather/forecast/lookup?${query}`,
        controller.signal,
      );
      setForecast(body.forecast);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setForecast(null);
      setError(
        error instanceof Error ? error.message : "Failed to load the forecast.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ForecastMap
        picked={picked}
        resolved={
          forecast
            ? {
                latitude: forecast.latitude,
                longitude: forecast.longitude,
                location: forecast.location,
              }
            : null
        }
        onPick={(location) => load(location, sizes)}
      />

      <p className="text-xs text-gray-500">
        Click the map or drag the pin to forecast somewhere else. Picked
        location:{" "}
        <span className="tabular-nums">{formatCoordinates(picked)}</span>
        {forecast && (
          <>
            {" "}
            · forecast for{" "}
            <span className="text-gray-900">
              {forecast.location || "an unnamed spot"}
              {forecast.country && `, ${forecast.country}`}
            </span>{" "}
            at{" "}
            <span className="tabular-nums">{formatCoordinates(forecast)}</span>{" "}
            ({forecast.timezone})
          </>
        )}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* The previous forecast stays on screen while the next one loads, at
          reduced opacity, so the page does not collapse and jump on every
          click of the map. */}
      {forecast && (
        <div
          className={`space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`}
        >
          <CurrentConditions forecast={forecast} />

          <div>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-gray-200">
              <div
                role="tablist"
                aria-label="Forecast block"
                className="flex flex-wrap gap-1"
              >
                {BLOCKS.map((option) => {
                  const isActive = option.value === block;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setBlock(option.value)}
                      className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "border-gray-900 font-medium text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* How much of the block on screen to ask for. Each block has
                  its own size, and the one being changed is the one whose tab
                  is open, so the picker follows the tabs. */}
              <div className="flex items-center gap-2 pb-2 text-sm">
                <label htmlFor={sizeId} className="text-gray-600">
                  Ask for
                </label>
                <select
                  id={sizeId}
                  value={sizes[block]}
                  onChange={(event) =>
                    load(picked, {
                      ...sizes,
                      [block]: Number(event.target.value),
                    })
                  }
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                >
                  {blockByName(block).sizes.map((size) => (
                    <option key={size} value={size}>
                      {size} {blockByName(block).unit}
                      {size === FORECAST_DEFAULTS[block] ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              All four sizes ride on the same call, so picking a different one
              fetches every tab again.{" "}
              {isDefaultSizes(sizes)
                ? "They are all at the API's default, which keeps the call at 1 credit."
                : "One of them is above the API's default, which puts the whole call at 3 credits."}
            </p>

            <div className="mt-4">
              {block === "minutely" && (
                <PrecipitationChart
                  minutes={forecast.minutely}
                  timezone={forecast.timezone}
                />
              )}
              {block === "hourly" && (
                <HourlyTable
                  hours={forecast.hourly}
                  timezone={forecast.timezone}
                  now={forecast.currently.time}
                />
              )}
              {block === "daypartly" && (
                <DaypartTable
                  dayparts={forecast.daypartly}
                  timezone={forecast.timezone}
                  now={forecast.currently.time}
                />
              )}
              {block === "daily" && (
                <DailyTable
                  days={forecast.daily}
                  timezone={forecast.timezone}
                  now={forecast.currently.time}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {!forecast && loading && (
        <p className="text-sm text-gray-500">Loading the forecast…</p>
      )}
    </div>
  );
}
