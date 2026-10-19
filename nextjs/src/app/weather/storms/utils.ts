/**
 * Types and helpers for the Tropical Storms example. The shapes below cover
 * the fields the Tropical Storms API returns for a storm.
 */

/** A speed in every unit the API reports it in. Null where it is unknown. */
export interface Speed {
  kph: number | null;
  kts: number | null;
  mph: number | null;
  mps: number | null;
}

/** Air pressure at the centre of the storm. */
export interface Pressure {
  /** Inches of mercury. */
  in: number | null;
  /** Millibars, which is the same number as hectopascals. */
  mb: number | null;
}

/** Which way the storm is heading. */
export interface Direction {
  /** Compass point, e.g. "NW" or "SSE". */
  text: string;
  /** True degrees, 0–360. */
  degrees: number;
}

/** What is measured at the centre of the storm. */
export interface Conditions {
  pressure: Pressure;
  windSpeed: Speed;
  gustSpeed: Speed;
  movementSpeed: Speed;
  movementDirection: Direction;
}

/** One position along the track of a storm. */
export interface TrackPoint extends Conditions {
  /** The name at this moment, which changes as the storm is upgraded. */
  name: string;
  nameShort: string;
  /** The category at this moment. */
  category: string;
  latitude: number;
  longitude: number;
  /** Unix time, in seconds. */
  timestamp: number;
}

/** A ring of [longitude, latitude] pairs, closed: the last equals the first. */
export type Ring = [number, number][];

/** One active storm, as the Tropical Storms API returns it. */
export interface Storm {
  /** Year, basin and number, e.g. "2026-WP-01". */
  id: string;
  name: string;
  nameShort: string;
  /** The current category: "I", "TD", "TS" or "TY". */
  category: string;
  /**
   * The area the centre is forecast to pass through, as polygons. Often
   * empty: an invest or a storm that has just formed has no forecast yet.
   */
  cone: Ring[];
  /** Oldest first. Can be a single point for a system that just appeared. */
  path: TrackPoint[];
  /**
   * The latest advisory. It carries no position, and can be newer than the
   * last point of the path, so its readings do not always match that point.
   */
  current: Conditions;
}

/** The units every speed comes in, in the order the toggle offers them. */
export const SPEED_UNITS = [
  { code: "kts", label: "kn" },
  { code: "kph", label: "km/h" },
  { code: "mph", label: "mph" },
  { code: "mps", label: "m/s" },
] as const;

export type SpeedUnit = (typeof SPEED_UNITS)[number]["code"];

/** Knots, which is what the warning centres themselves write advisories in. */
export const DEFAULT_SPEED_UNIT: SpeedUnit = "kts";

export function isSpeedUnit(value: string | null): value is SpeedUnit {
  return SPEED_UNITS.some((unit) => unit.code === value);
}

/** "35 kn", or a dash where the API had no reading. */
export function formatSpeed(speed: Speed, unit: SpeedUnit): string {
  const value = speed[unit];
  if (value === null || value === undefined) return "–";
  const label = SPEED_UNITS.find((option) => option.code === unit)!.label;
  return `${Math.round(value)} ${label}`;
}

/** "997 hPa", or a dash where the API had no reading. */
export function formatPressure(pressure: Pressure): string {
  return pressure.mb === null ? "–" : `${Math.round(pressure.mb)} hPa`;
}

/** "NE at 10 kn", or just the direction while the storm is stationary. */
export function formatMovement(
  conditions: Conditions,
  unit: SpeedUnit,
): string {
  const speed = formatSpeed(conditions.movementSpeed, unit);
  const direction = conditions.movementDirection.text;
  return speed === "–" ? direction || "–" : `${direction} at ${speed}`;
}

/** How a category is named and coloured. */
export interface CategoryMeta {
  label: string;
  color: string;
  /** Foreground that stays readable on `color`. */
  textColor: string;
  /** Weakest first, for sorting. */
  rank: number;
}

/**
 * The categories the API answers with. They follow the wind speed rather than
 * the local name of a storm: the strongest systems are "TY" in every basin,
 * which is why the full `name` still says "Tropical Cyclone" in the southern
 * hemisphere. An invest ("I") is an area the warning centres are watching that
 * has not organised into a storm yet.
 */
export const CATEGORIES: Record<string, CategoryMeta> = {
  I: { label: "Invest", color: "#6b7280", textColor: "#ffffff", rank: 0 },
  TD: {
    label: "Tropical depression",
    color: "#0070de",
    textColor: "#ffffff",
    rank: 1,
  },
  TS: {
    label: "Tropical storm",
    color: "#eab308",
    textColor: "#2e2e2b",
    rank: 2,
  },
  TY: {
    label: "Typhoon / hurricane",
    color: "#dc2626",
    textColor: "#ffffff",
    rank: 3,
  },
};

/** A code this example does not know is shown as it is, in grey. */
export function categoryMeta(category: string): CategoryMeta {
  return (
    CATEGORIES[category] ?? {
      label: category,
      color: "#6b7280",
      textColor: "#ffffff",
      rank: -1,
    }
  );
}

/**
 * The basins the warning centres divide the oceans into, by the code the
 * storm id carries.
 */
const BASINS: Record<string, string> = {
  AL: "North Atlantic",
  EP: "Eastern Pacific",
  CP: "Central Pacific",
  WP: "Western Pacific",
  IO: "North Indian Ocean",
  SH: "Southern Hemisphere",
  SL: "South Atlantic",
};

/** "2026-WP-01" → "Western Pacific" */
export function basinName(storm: Storm): string {
  const code = storm.id.split("-")[1] ?? "";
  return BASINS[code] ?? code;
}

/**
 * Strongest first, by the wind of the latest advisory, then by category for
 * the ones whose wind is unknown.
 */
export function sortStorms(storms: Storm[]): Storm[] {
  return [...storms].sort((a, b) => {
    const wind =
      (b.current.windSpeed.kts ?? -1) - (a.current.windSpeed.kts ?? -1);
    if (wind !== 0) return wind;
    return categoryMeta(b.category).rank - categoryMeta(a.category).rank;
  });
}

/**
 * Where the storm is now: the newest point of the path that is not forecast,
 * or the first one should every point lie ahead of `now`.
 */
export function latestPoint(storm: Storm, now: number): TrackPoint {
  const { observed } = splitTrack(storm, now);
  return observed[observed.length - 1] ?? storm.path[0];
}

/**
 * The path with each longitude moved by a whole turn where needed, so a
 * track that crosses the date line is drawn across it instead of all the way
 * round the world the other way. MapLibre accepts longitudes past ±180 and
 * draws them on the next copy of the world.
 *
 * `reference` is a longitude for the first point to be brought near, so a
 * cone lands on the same copy of the world as the track it belongs to.
 */
export function unwrapLongitudes(
  points: [number, number][],
  reference?: number,
): [number, number][] {
  const result: [number, number][] = [];
  for (const [longitude, latitude] of points) {
    const previous = result[result.length - 1]?.[0] ?? reference;
    let unwrapped = longitude;
    if (previous !== undefined) {
      while (unwrapped - previous > 180) unwrapped -= 360;
      while (unwrapped - previous < -180) unwrapped += 360;
    }
    result.push([unwrapped, latitude]);
  }
  return result;
}

/**
 * The path in two parts: where the storm has been, and the points after now,
 * which are forecast. They share the point where one turns into the other, so
 * the line drawn from them is unbroken.
 */
export function splitTrack(
  storm: Storm,
  now: number,
): { observed: TrackPoint[]; forecast: TrackPoint[] } {
  const seconds = now / 1000;
  const firstForecast = storm.path.findIndex(
    (point) => point.timestamp > seconds,
  );
  if (firstForecast === -1) return { observed: storm.path, forecast: [] };

  return {
    observed: storm.path.slice(0, firstForecast),
    forecast: storm.path.slice(Math.max(0, firstForecast - 1)),
  };
}

/** "17.3°N 129.1°E" */
export function formatPosition(point: {
  latitude: number;
  longitude: number;
}): string {
  const latitude = `${Math.abs(point.latitude).toFixed(1)}°${point.latitude >= 0 ? "N" : "S"}`;
  const longitude = `${Math.abs(point.longitude).toFixed(1)}°${point.longitude >= 0 ? "E" : "W"}`;
  return `${latitude} ${longitude}`;
}

/** 1768867200 → "Tue 20 Jan, 01:00", in the visitor's own time zone. */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3 h ago", "2 days ago", for how old the latest position is. */
export function formatAge(timestamp: number, now: number): string {
  const hours = Math.round((now / 1000 - timestamp) / 3600);
  if (hours < 1) return "just now";
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
