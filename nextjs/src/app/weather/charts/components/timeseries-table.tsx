"use client";

import { TimeseriesTableForecast } from "@infoplaza/platform/timeseries-table";
// The utilities the package's own components are styled with. This is the
// embed build: prefixed classes only, no reset, so it cannot reach the rest
// of the app. A standalone app would import styles.css instead.
import "@infoplaza/platform/styles.embed.css";
import type { LatLon } from "../utils";

/**
 * The hours of one weather model, read as a table.
 *
 * `TimeseriesTableForecast` is the packaged form: a toolbar to pick the model,
 * the run and the groups of elements, one hourly matrix with its labels kept
 * in place and a day navigator, and a footer. The requests behind it are its
 * own. It loads the model catalog for this point, then the point forecast for
 * whatever is selected.
 *
 * The location is the key as well as a pair of props: changing it is a
 * different catalog and a different forecast, and remounting is what makes
 * the toolbar start again from what the new location can offer instead of
 * holding on to a model that may not reach it.
 */
export default function TimeseriesTable({ location }: { location: LatLon }) {
  return (
    <TimeseriesTableForecast
      key={`${location.latitude},${location.longitude}`}
      lat={location.latitude}
      lon={location.longitude}
      locale="en"
      // The browser's own zone, which is what a forecast is read in.
      timezone={null}
      // A ceiling rather than a height: the table is as tall as the elements
      // the selected groups have, and only scrolls once there are more of
      // them than fit.
      className="max-h-[560px]"
    />
  );
}
