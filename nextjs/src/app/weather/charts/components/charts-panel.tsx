"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePlatformProxyLog } from "@/lib/platform-proxy-log";
import {
  CHARTS,
  chartByName,
  DEFAULT_LOCATION,
  formatCoordinates,
  type ChartName,
  type LatLon,
} from "../utils";

/**
 * Ties the example together: the location picked on the map decides what the
 * chart below it is read for, and the chart loads what it needs itself.
 *
 * One chart is on screen at a time, and it is the only one mounted. Each of
 * them asks for its own catalog and its own forecast, which is two calls and
 * a few credits, so opening the page or moving the pin pays for the chart
 * being looked at rather than for both.
 *
 * All of it is loaded on the client only. MapLibre needs a browser, and the
 * charts fetch as they mount and draw on a measured width, so there is
 * nothing for the server to render but the boxes they will fill.
 */
const ChartsMap = dynamic(() => import("./charts-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
  ),
});

const chartSkeleton = () => (
  <div className="h-[560px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
);

const HourlyForecast = dynamic(() => import("./hourly-forecast"), {
  ssr: false,
  loading: chartSkeleton,
});

const EnsembleSpread = dynamic(() => import("./ensemble-spread"), {
  ssr: false,
  loading: chartSkeleton,
});

export function ChartsPanel() {
  // The components fetch for themselves, so their calls are collected from
  // the server instead of arriving with an answer to something this page
  // asked. Everything they ask for lands in the drawer on the right.
  usePlatformProxyLog();

  const [picked, setPicked] = useState<LatLon>(DEFAULT_LOCATION);
  const [chart, setChart] = useState<ChartName>("hourly");

  return (
    <div className="space-y-6">
      <ChartsMap picked={picked} onPick={setPicked} />

      <p className="text-xs text-dark/70">
        Click the map or drag the pin to chart somewhere else. Picked location:{" "}
        <span className="tabular-nums">{formatCoordinates(picked)}</span>. Which
        models cover a point differs, so a chart loads its own catalog for the
        location before it can offer one.
      </p>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-cloud-dark">
          <div role="tablist" aria-label="Chart" className="flex flex-wrap gap-1">
            {CHARTS.map((option) => {
              const isActive = option.value === chart;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setChart(option.value)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-primary font-medium text-dark"
                      : "border-transparent text-dark/70 hover:text-dark"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-xs text-dark/70">
          {chartByName(chart).detail}
        </p>

        {/* Only the chart on screen is mounted, so the tab that is not open
            has asked the Platform for nothing. */}
        <div className="mt-3 overflow-hidden rounded-lg border border-cloud-dark bg-white">
          {chart === "hourly" ? (
            <HourlyForecast location={picked} />
          ) : (
            <EnsembleSpread location={picked} />
          )}
        </div>
      </div>
    </div>
  );
}
