"use client";

import { useState } from "react";
import { formatValue, type Reading } from "../utils";

/**
 * Everything one observation holds, as a grid of label and value.
 *
 * The rows are built from whatever keys came back, so the same list shows the
 * seventy-odd values of a KNMI station and the two of a wave buoy. The long
 * lists open folded, so the history below them stays in reach. A number can
 * be picked to draw its history in the chart; text cannot be drawn, so it is
 * shown but not offered.
 */

/** How many rows show before the rest are folded away: four rows of three. */
const FOLDED_ROWS = 12;

export function ReadingsList({
  readings,
  chartKey,
  onChart,
}: {
  readings: Reading[];
  /** The value the chart draws, marked in the list. */
  chartKey: string | null;
  /** Left out where there is no chart to draw in. */
  onChart?: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Leaving a single row folded away would save nothing.
  const foldable = readings.length > FOLDED_ROWS + 3;
  const shown =
    foldable && !expanded ? readings.slice(0, FOLDED_ROWS) : readings;

  return (
    <>
      <dl className="grid gap-x-8 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((reading) => {
          const chartable =
            onChart !== undefined && typeof reading.value === "number";
          const charted = reading.key === chartKey;

          return (
            <div
              key={reading.key}
              className="flex items-baseline justify-between gap-4 border-b border-cloud py-2"
            >
              <dt className="min-w-0 text-dark/70">
                {chartable ? (
                  <button
                    type="button"
                    onClick={() => onChart?.(reading.key)}
                    aria-pressed={charted}
                    title="Draw this value in the chart"
                    className={`text-left hover:text-primary hover:underline ${
                      charted ? "font-medium text-primary" : ""
                    }`}
                  >
                    {reading.label}
                  </button>
                ) : (
                  reading.label
                )}
              </dt>
              <dd className="max-w-[55%] text-right text-dark tabular-nums">
                {formatValue(reading.value)}
                {reading.unit && (
                  <span className="ml-1 text-dark/50">{reading.unit}</span>
                )}
                {reading.description && (
                  <span className="block text-xs text-dark/60">
                    {reading.description}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {foldable && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm text-primary hover:underline"
        >
          {expanded
            ? "Show fewer values"
            : `Show all ${readings.length} values`}
        </button>
      )}
    </>
  );
}
