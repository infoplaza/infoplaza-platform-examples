"use client";

import { EnsembleForecast } from "@infoplaza/platform/ensemble";
// The same embed build the table imports; loaded once for the page.
import "@infoplaza/platform/styles.embed.css";
import type { LatLon } from "../utils";

/**
 * The same point read from an ensemble, drawn as a graph.
 *
 * An ensemble model is run many times over from slightly different starting
 * conditions, and each of those runs is a member. `EnsembleForecast` draws
 * them together: a plume where the members agree is a forecast to trust, and
 * one that fans out is the model saying it does not know yet. That is what
 * this shows that the table cannot, which reads a single line per element.
 *
 * The composition is the timeseries one over again, with its own catalog and
 * point endpoints: a toolbar, the graphs, and a footer.
 */
export default function EnsembleSpread({ location }: { location: LatLon }) {
  return (
    <EnsembleForecast
      key={`${location.latitude},${location.longitude}`}
      lat={location.latitude}
      lon={location.longitude}
      locale="en"
      timezone={null}
      className="max-h-[560px]"
    />
  );
}
