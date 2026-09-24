"use client";

import { TimeseriesChartsForecast } from "@infoplaza/platform/timeseries-charts";
// The same embed build the table imports; loaded once for the page.
import "@infoplaza/platform/styles.embed.css";
import type { LatLon } from "../utils";

/**
 * The same forecast as the table, drawn as graphs.
 *
 * `TimeseriesChartsForecast` asks for the same catalog and point forecast and
 * shares its toolbar with the table, but stacks one chart per group of
 * elements instead: lines for the values, arrows for directions and icons for
 * the type of precipitation. Where the table is for reading an hour, this is
 * for seeing where a forecast is heading.
 *
 * Keyed on the location for the same reason as the table.
 */
export default function TimeseriesCharts({ location }: { location: LatLon }) {
  return (
    <TimeseriesChartsForecast
      key={`${location.latitude},${location.longitude}`}
      lat={location.latitude}
      lon={location.longitude}
      locale="en"
      timezone={null}
    />
  );
}
