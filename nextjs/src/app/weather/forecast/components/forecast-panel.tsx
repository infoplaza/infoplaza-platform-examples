"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  BLOCKS,
  DEFAULT_LOCATION,
  formatCoordinates,
  type BlockName,
  type Forecast,
  type LatLon,
} from "../utils";
import { CurrentConditions } from "./current-conditions";
import { DailyTable, DaypartTable, HourlyTable } from "./forecast-tables";
import { PrecipitationChart } from "./precipitation-chart";

/**
 * Ties the example together: a picked location fills the whole page below the
 * map, and the tabs switch between the four blocks the one call came back
 * with.
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

    try {
      const response = await fetch(
        `/weather/forecast/lookup?lat=${location.latitude}&lon=${location.longitude}`,
        { signal: controller.signal },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Request failed.");
      setForecast(body.forecast as Forecast);
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
        onPick={pickLocation}
      />

      <p className="text-xs text-gray-500">
        Click the map or drag the pin to forecast somewhere else. Picked
        location: <span className="tabular-nums">{formatCoordinates(picked)}</span>
        {forecast && (
          <>
            {" "}
            · forecast for{" "}
            <span className="text-gray-900">
              {forecast.location || "an unnamed spot"}
              {forecast.country && `, ${forecast.country}`}
            </span>{" "}
            at <span className="tabular-nums">{formatCoordinates(forecast)}</span>{" "}
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
            <div
              role="tablist"
              aria-label="Forecast block"
              className="flex flex-wrap gap-1 border-b border-gray-200"
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
