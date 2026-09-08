/**
 * Client-side helpers and types for the Charts example. Both charts are read
 * for one point, and this is where that point starts.
 */

/** A point on the globe. */
export interface LatLon {
  latitude: number;
  longitude: number;
}

/** Where the map opens. Every other location is a click on it away. */
export const DEFAULT_LOCATION: LatLon = {
  latitude: 52.3676,
  longitude: 4.9041,
};

/** Which chart is on screen. Only that one is loaded. */
export type ChartName = "hourly" | "ensemble";

/** The two charts, in the order their tabs are shown. */
export const CHARTS: readonly {
  value: ChartName;
  label: string;
  /** What the chart shows, under the tabs. */
  detail: string;
}[] = [
  {
    value: "hourly",
    label: "Hour by hour",
    detail:
      "One model at a time, every element it has for this point, coloured by what the value means.",
  },
  {
    value: "ensemble",
    label: "Ensemble spread",
    detail:
      "One model run many times over, drawn as the range its members leave between them.",
  },
];

/** The chart a name stands for, falling back to the first tab. */
export function chartByName(name: ChartName): (typeof CHARTS)[number] {
  return CHARTS.find((chart) => chart.value === name) ?? CHARTS[0];
}

/** 52.36757 → "52.36757, 4.90411" */
export function formatCoordinates(point: LatLon): string {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}
