"use client";

import { TimeseriesForecast } from "@infoplaza/platform/timeseries";
// The utilities the package's own components are styled with. This is the
// embed build: prefixed classes only, no reset, so it cannot reach the rest
// of the app. A standalone app would import styles.css instead.
import "@infoplaza/platform/styles.embed.css";
import type { LatLon } from "../utils";

/**
 * The hours of one weather model, read as a table.
 *
 * `TimeseriesForecast` is the packaged form: a toolbar to pick the model, the
 * run and the group of elements, the table itself, and a footer. The three
 * requests behind it are its own. It loads the model catalog for this point,
 * then the point forecast for whatever is selected, and it colours every cell
 * from what the Platform says that value looks like, so the table reads as a
 * chart rather than as a grid of numbers.
 *
 * The location is the key as well as a pair of props: changing it is a
 * different catalog and a different forecast, and remounting is what makes
 * the toolbar start again from what the new location can offer instead of
 * holding on to a model that may not reach it.
 */
export default function HourlyForecast({ location }: { location: LatLon }) {
  return (
    <TimeseriesForecast
      key={formatKey(location)}
      lat={location.latitude}
      lon={location.longitude}
      locale="en"
      // The browser's own zone, which is what a forecast is read in.
      timezone={null}
      // Two lines above each column: the day, and the hour under it.
      headerFormat={["EEEEEE d MMM", "HH"]}
      scrollToCurrentTime
      // A ceiling rather than a height: the table is as tall as the elements
      // the selected group has, and only scrolls once there are more of them
      // than fit.
      className="max-h-[560px]"
    />
  );
}

function formatKey(location: LatLon): string {
  return `${location.latitude},${location.longitude}`;
}
