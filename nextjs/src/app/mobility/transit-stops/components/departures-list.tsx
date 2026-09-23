"use client";

import {
  delayMinutes,
  formatTime,
  lineBadgeStyle,
  modeLabel,
  type Departure,
} from "../utils";

/**
 * The next departures from the selected stop. A busy station can return well
 * over a hundred rows for the coming hour, so only the first few are shown.
 */

const MAX_DEPARTURES = 25;

interface DeparturesListProps {
  departures: Departure[];
}

export function DeparturesList({ departures }: DeparturesListProps) {
  const shown = departures.slice(0, MAX_DEPARTURES);

  return (
    <>
      <ul className="divide-y divide-cloud">
        {shown.map((departure, index) => {
          const delay = delayMinutes(departure);
          return (
            <li
              key={`${departure.serviceJourneyId ?? index}-${departure.aimedDepartureTime}`}
              className="flex items-center gap-3 py-2.5"
            >
              <span
                className="w-11 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-semibold"
                style={lineBadgeStyle(departure.line)}
                title={modeLabel(departure.line?.mode)}
              >
                {departure.line?.publicCode ?? "–"}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm ${
                    departure.cancelled
                      ? "text-dark/50 line-through"
                      : "text-dark"
                  }`}
                >
                  {departure.destination ?? "Unknown destination"}
                </span>
                <span className="block truncate text-xs text-dark/70">
                  {[
                    modeLabel(departure.line?.mode),
                    departure.quay?.publicCode
                      ? `Platform ${departure.quay.publicCode}`
                      : null,
                    departure.operator?.id,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-sm tabular-nums text-dark">
                  {formatTime(
                    departure.expectedDepartureTime ??
                      departure.aimedDepartureTime,
                  )}
                </span>
                {departure.cancelled ? (
                  <span className="block text-xs text-red-600">Cancelled</span>
                ) : delay ? (
                  <span className="block text-xs text-amber-600">
                    +{delay} min
                  </span>
                ) : departure.realtime ? (
                  <span className="block text-xs text-green-600">Live</span>
                ) : (
                  <span className="block text-xs text-dark/50">Scheduled</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {departures.length > shown.length && (
        <p className="pt-3 text-xs text-dark/50">
          Showing {shown.length} of {departures.length} departures in the next
          hour.
        </p>
      )}
    </>
  );
}
