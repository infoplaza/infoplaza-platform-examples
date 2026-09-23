"use client";

import {
  formatCoordinates,
  formatMoment,
  nearestTimeIndex,
  type PointForecast,
} from "../utils";
import { PointTable } from "./forecast-tables";

/**
 * The point forecast at the selected waypoint: the whole model run at one
 * position, rather than the single hour the route forecast reads there.
 *
 * The route says what the weather is when the ship passes. This says what it
 * is around that moment — the hours before it and after it — which is what a
 * decision to leave later or slow down is made on. The row the ship is there
 * on is marked, so both readings can be seen at once.
 */

interface WaypointForecastProps {
  /** Which waypoint this is, counted from one along the voyage. */
  number: number;
  lat: number;
  lon: number;
  forecast: PointForecast | null;
  /** When the ship is here, if the route has been worked out. */
  arrivalTime: number | null;
  loading: boolean;
  error: string | null;
  onClose(): void;
}

export function WaypointForecast({
  number,
  lat,
  lon,
  forecast,
  arrivalTime,
  loading,
  error,
  onClose,
}: WaypointForecastProps) {
  const arrivalIndex =
    forecast && arrivalTime !== null
      ? nearestTimeIndex(forecast.times, arrivalTime)
      : null;

  return (
    <section className="rounded-lg border border-marine/20 bg-marine/3 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Waypoint {number}</h2>
          <p className="mt-0.5 text-sm text-dark/80 tabular-nums">
            {formatCoordinates(lat, lon)}
            {arrivalTime !== null && (
              <span className="text-dark/50">
                {" · "}
                {number === 1 ? "leaves" : "arrives"} {formatMoment(arrivalTime)}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-cloud-dark bg-white px-2.5 py-1 text-xs font-medium text-dark/80 transition-colors hover:bg-cloud"
        >
          Close
        </button>
      </header>

      <div className="mt-5">
        {loading && <p className="text-sm text-dark/70">Loading forecast…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {forecast && !loading && !error && (
          <PointTable forecast={forecast} arrivalIndex={arrivalIndex} />
        )}
      </div>
    </section>
  );
}
