/**
 * Types and helpers for the Observations example, shared by the server-side
 * client and the components.
 *
 * Every network the Observations API reads from measures something else — a
 * KNMI station reports seventy-odd values every ten minutes, a wave buoy two —
 * so an observation is an open set of `values` rather than a fixed shape. The
 * helpers here turn whatever arrives into rows a person can read, without a
 * list of every key per network to keep up to date.
 */

/** A network the API reads from, as the Sources endpoint lists it. */
export interface ObservationSource {
  id: string;
  name: string;
  description: string;
  /** Which of the lookup endpoints accept this source. */
  supports: { area: boolean; point: boolean; station: boolean };
}

/** Where a station is. `name` is null for networks that only number them. */
export interface Station {
  id: number;
  name: string | null;
  lat: number;
  lng: number;
  /** Metres. Most networks do not report it. */
  elevation: number | null;
}

/** A station the Point endpoint found, with how far it is from the point. */
export interface NearbyStation extends Station {
  /** Kilometres from the point that was asked about. */
  distance: number;
}

/** One moment at one station. */
export interface Observation {
  /** ISO timestamp, in UTC. */
  date: string;
  values: ObservationValues;
}

/** An observation from the Area endpoint, which says which station it is. */
export interface AreaObservation extends Observation {
  station: Station;
}

/**
 * What a station measured. Numbers, mostly, but also codes with a wording
 * beside them, the units of the numbers, and for weather balloons the whole
 * profile as an array — so it stays open-ended.
 */
export type ObservationValues = Record<string, unknown>;

export interface LatLon {
  latitude: number;
  longitude: number;
}

/** West, south, east, north, in degrees — the order `bounds` takes them in. */
export type Bounds = [number, number, number, number];

/** KNMI's ten-minute network: dense, and around the place the page opens on. */
export const DEFAULT_SOURCE = "knmi-minutely";

/** De Bilt, where KNMI is based, and the station it reports first. */
export const DEFAULT_STATION_ID = 66;

/**
 * How far the Point endpoint may look for a station, in kilometres. The API
 * itself defaults to 100 and refuses anything further.
 */
export const DISTANCE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_DISTANCE = 25;

/**
 * How many readings the history asks for. Every observation in an answer is a
 * credit, so the length is what is chosen rather than a stretch of time: 144
 * readings cost at most 144 credits whether the station reports every six
 * minutes or once a day, where a day of history would cost 240 at one station
 * and 1 at the next. (A daily station has only 32 readings in the 31 days a
 * series may span, so it returns, and costs, fewer.)
 */
export const HISTORY_LENGTHS = [24, 72, 144] as const;
export type HistoryLength = (typeof HISTORY_LENGTHS)[number];

/** The longest period a series may cover, for every source tried. */
export const MAX_PERIOD_DAYS = 31;

/**
 * The most observations one Area call may return. The call costs one credit
 * per observation, and a view of Europe holds thousands of stations, so the
 * cap is set here and on the server rather than left to the endpoint.
 */
export const AREA_LIMIT = 100;

export function isDistance(value: number): boolean {
  return (DISTANCE_OPTIONS as readonly number[]).includes(value);
}

export function isHistoryLength(value: number): value is HistoryLength {
  return (HISTORY_LENGTHS as readonly number[]).includes(value);
}

/** Source ids are lowercase words joined by dashes, e.g. "knmi-minutely". */
export function isSourceId(value: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(value);
}

/** "De Bilt", or "Station 6893" for a network that only numbers them. */
export function stationName(station: Station): string {
  return station.name?.trim() || `Station ${station.id}`;
}

/** "52.0989, 5.1797" */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** "0.1 km", "17.7 km" */
export function formatDistance(kilometres: number): string {
  return `${Number(kilometres.toFixed(1))} km`;
}

/**
 * "19 Oct, 13:40 UTC". Observations from every network are reported in UTC and
 * shown that way, which is also what keeps the server render and the browser
 * from disagreeing about the hour.
 */
export function formatObserved(date: string): string {
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date))} UTC`;
}

const numberFormat = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 2,
});

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** One value of an observation, ready to show. */
export interface Reading {
  key: string;
  label: string;
  value: number | string | boolean;
  /** Null where the observation names no unit for it. */
  unit: string | null;
  /** What a code means, for the values that are codes. */
  description: string | null;
}

/**
 * The values of an observation as rows, in the order the API sent them.
 *
 * Two kinds of key are not readings of their own and are folded into the
 * rows they belong to: `…Unit` keys, which say what a number is measured in,
 * and `…Description` keys, which say what a code means. Nested values — the
 * levels of a balloon ascent — are left out, as they do not fit in a row.
 */
export function readings(values: ObservationValues): Reading[] {
  const units = unitStems(values);
  const rows: Reading[] = [];

  for (const [key, value] of Object.entries(values)) {
    if (isUnitKey(key, value)) continue;
    if (key.endsWith("Description") && key.slice(0, -11) in values) continue;
    if (!isScalar(value)) continue;

    const description = values[`${key}Description`];
    const isCode = typeof description === "string";
    rows.push({
      key,
      label: fieldLabel(key),
      value,
      unit: isCode ? null : unitFor(key, units),
      description: isCode ? description : null,
    });
  }

  return rows;
}

/** The keys that hold a number in at least one of the observations. */
export function numericKeys(observations: Observation[]): string[] {
  const keys = new Set<string>();
  for (const observation of observations) {
    for (const [key, value] of Object.entries(observation.values)) {
      if (typeof value === "number" && Number.isFinite(value)) keys.add(key);
    }
  }
  return [...keys];
}

/**
 * The value to show first: the air temperature where a station measures it,
 * the wave height at a buoy, and otherwise whatever number comes first.
 */
export function preferredKey(keys: string[]): string | null {
  const preferences = [
    /^airTemperature2m$/,
    /^airTemperature$/,
    /^significantWaveHeight$/,
    /temperature/i,
  ];
  for (const pattern of preferences) {
    const match = keys.find((key) => pattern.test(key));
    if (match) return match;
  }
  return keys[0] ?? null;
}

/** The unit for a key in an observation, as shown. */
export function unitOf(key: string, values: ObservationValues): string | null {
  return unitFor(key, unitStems(values));
}

/**
 * Units arrive inside `values`, under keys of their own, and networks name
 * them two ways. Some name the value they belong to — `cloudBaseUnit` for
 * `cloudBase` and `cloudBaseLayer1` — and others name a quantity —
 * `temperatureUnit` for `airTemperature2m` and `dewPointTemperature2m`. Both
 * are a stem the value's key contains, so the longest stem it contains wins:
 * `precipitationIntensity10min` takes `precipitationIntensityUnit` (mm/h)
 * over `precipitationUnit` (mm).
 *
 * A network that names no unit gets none rather than a guess. KNMI's
 * ten-minute readings name none for temperature or wind.
 */
function unitFor(key: string, stems: [string, string][]): string | null {
  // "maximumTemperatureHour" contains "temperature", but it is the hour of
  // the day the maximum was reached, not a temperature.
  if (/[a-z]Hour$/.test(key)) return null;

  const lower = key.toLowerCase();
  let best: [string, string] | null = null;
  for (const stem of stems) {
    if (!lower.includes(stem[0])) continue;
    if (!best || stem[0].length > best[0].length) best = stem;
  }
  return best ? unitLabel(best[1]) : null;
}

/** Every `…Unit` key of an observation, as its lowercased stem and unit. */
function unitStems(values: ObservationValues): [string, string][] {
  return Object.entries(values)
    .filter(([key, value]) => isUnitKey(key, value))
    .map(([key, value]) => [key.slice(0, -4).toLowerCase(), String(value)]);
}

function isUnitKey(key: string, value: unknown): boolean {
  return key.endsWith("Unit") && key.length > 4 && typeof value === "string";
}

function isScalar(value: unknown): value is number | string | boolean {
  return (
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "string" ||
    typeof value === "boolean"
  );
}

/** The units as the API spells them, as they are usually written. */
const UNIT_LABELS: Record<string, string> = {
  degC: "°C",
  degrees: "°",
  "W/m2": "W/m²",
  "J/cm2": "J/cm²",
};

function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit;
}

/**
 * "airTemperature2m" → "Air temperature 2m",
 * "cloudBaseLayer1Ceilometer" → "Cloud base layer 1 ceilometer",
 * "wavenet_provider" → "Wavenet provider".
 *
 * The keys are camelCase, with a height or an interval stuck to the end, so
 * the words are split at each capital and before the number.
 */
export function fieldLabel(key: string): string {
  const words = key
    .replace(/_/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A value for a reading row or a map label. */
export function formatValue(value: number | string | boolean): string {
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value;
}
