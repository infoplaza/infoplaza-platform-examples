/**
 * Client-side helpers and types for the Shipping example. The shapes below
 * cover what the Shipping Point and Shipping Route APIs return.
 *
 * Both answer in the same vocabulary: a list of `elements`, each one
 * meteorological or oceanographic quantity from one model, carrying its own
 * unit and a `data` array of values. The point forecast has one value per
 * timestep at a fixed position; the route forecast has one value per position
 * along the track, each at the moment the ship is there. So the two are read
 * the same way, and the helpers below are shared between them.
 *
 * Everything is metric, as the API sends it: km/h for wind, metres for waves
 * and visibility, °C, hPa. The ship's own speed is the exception, and not one
 * this example makes: the reference calls `speeds` km/h, but the route that
 * comes back from asking for 30 covers its distance at 30 knots, so knots is
 * what is sent and what is shown.
 */

/** How a leg between two waypoints is drawn on the globe. */
export type Routing = "rhumb" | "greatcircle";

/** A waypoint as the map holds it. The id only has to survive a re-render. */
export interface Waypoint {
  id: number;
  lat: number;
  lon: number;
}

/** Which model answered, when it ran and how far it reaches. Unix seconds. */
export interface ModelInfo {
  key: string;
  runtime: number;
  range: { from: number; to: number };
}

/**
 * One value of one element.
 *
 * `time` is the moment it describes — for a route, the moment the ship is at
 * `lat`/`lon`. `offset` and `offsetTime` say which model timestep it was read
 * from, which is how far the value was interpolated in time. A gap in the
 * model comes back as a `null` value rather than a missing entry, so the
 * arrays stay aligned with the times and positions they belong to.
 */
export interface ElementValue {
  time: number;
  value: number | null;
  /** Index of the model timestep the value came from. */
  offset: number | null;
  /** The moment of that timestep. */
  offsetTime: number | null;
  /** Route forecasts only: where along the track this value sits. */
  lat?: number;
  lon?: number;
  kind?: "waypoint" | "timestep";
  waypointIndex?: number | null;
}

/** One quantity from one model, with its values. */
export interface ForecastElement {
  key: string;
  label: string;
  /** "km/h", "m", "°C", … Null for the few elements without one. */
  unit: string | null;
  /** "10m", "2m", "seasurface", or null when the element has no level. */
  level: string | null;
  model: string;
  element: string | null;
  data: ElementValue[];
  /**
   * Set when this one element could not be answered — a model file that is
   * not there yet, most often. The rest of the response is still good, so an
   * element with an error is shown as empty rather than failing the request.
   */
  error?: string | null;
}

/** What the Shipping Point API answers for one position. */
export interface PointForecast {
  lat: number;
  lon: number;
  /** The moments every element's `data` array is indexed by. */
  times: number[];
  models: ModelInfo[];
  elements: ForecastElement[];
}

/**
 * One position along the track. The waypoints that were asked for come back
 * as `type: "waypoint"`; everything between them is a `timestep` the API put
 * in where the ship crosses a model hour.
 */
export interface RoutePoint {
  lat: number;
  lon: number;
  /** When the ship is here. */
  time: number;
  type: "waypoint" | "timestep";
  /** Knots from here to the next point. Null at the last waypoint. */
  speed: number | null;
  /** Metres sailed since the last waypoint, not since the departure. */
  distance: number;
  /** Seconds since the last waypoint, not since the departure. */
  distanceTime: number;
}

/** What the Shipping Route API answers for a track. */
export interface RouteForecast {
  start: number;
  routing: Routing;
  /** Knots, one per leg, as the request set them. */
  speeds: number[];
  /** The arrival times a request can name instead of a speed. Null here. */
  times: number[] | null;
  points: RoutePoint[];
  models: ModelInfo[];
  /** Indexed by position: `data[i]` belongs to `points[i]`. */
  elements: ForecastElement[];
}

/* -------------------------------------------------------------------------
 * The voyage the example opens on
 * ---------------------------------------------------------------------- */

/** The two positions the API reference uses in its own example, off the
 * Dutch coast and out into the North Sea. */
export const DEFAULT_WAYPOINTS: Omit<Waypoint, "id">[] = [
  { lat: 51.816, lon: 2.259 },
  { lat: 54.147, lon: 3.283 },
];

/** A workaday merchant speed, and what the speed field opens on. */
export const DEFAULT_SPEED_KNOTS = 16;

export const ROUTINGS = [
  {
    code: "rhumb",
    label: "Rhumb line",
    description: "A constant compass course. Longer, but steered without turning.",
  },
  {
    code: "greatcircle",
    label: "Great circle",
    description: "The shortest way over the globe. The course changes as you sail it.",
  },
] as const satisfies readonly {
  code: Routing;
  label: string;
  description: string;
}[];

export function isRouting(value: string): value is Routing {
  return ROUTINGS.some((option) => option.code === value);
}

/** One knot is one nautical mile per hour. */
export const METRES_PER_NAUTICAL_MILE = 1852;

/* -------------------------------------------------------------------------
 * The columns both tables show
 * ---------------------------------------------------------------------- */

/**
 * One column of the forecast tables.
 *
 * The API answers with two dozen elements, from swell period to chlorophyll;
 * these are the ones a bridge reads on passage. Everything else is in the
 * response and can be added here by its key alone.
 */
export interface Column {
  /** Element key, as the API names it. */
  key: string;
  label: string;
  decimals: number;
  /** The element holding the direction this value comes from, if any. */
  direction?: string;
  /** Applied before formatting, for units worth rescaling. */
  scale?: number;
  /** Overrides the unit the API reports, for a rescaled value. */
  unit?: string;
}

export const COLUMNS: Column[] = [
  { key: "windSpeed10m", label: "Wind", decimals: 0, direction: "windDirection10m" },
  { key: "windGust10m", label: "Gusts", decimals: 0 },
  {
    key: "significantWaveHeight",
    label: "Waves",
    decimals: 1,
    direction: "meanWaveDirection",
  },
  { key: "meanWavePeriod", label: "Period", decimals: 0 },
  { key: "significantHeightSwell", label: "Swell", decimals: 1 },
  { key: "airTemperature2m", label: "Air", decimals: 0 },
  { key: "seaSurfaceTemperature", label: "Sea", decimals: 0 },
  { key: "meanSeaLevelPressure", label: "Pressure", decimals: 0 },
  // Visibility comes in metres, which runs to five digits at sea.
  { key: "visibility", label: "Visibility", decimals: 0, scale: 1 / 1000, unit: "km" },
];

/** The elements by key, so a column can find its own in one lookup. */
export function indexElements(
  elements: ForecastElement[],
): Map<string, ForecastElement> {
  return new Map(elements.map((element) => [element.key, element]));
}

/**
 * The value of one element at row `index`.
 *
 * Every element's `data` array runs parallel to the times of a point forecast
 * and to the positions of a route forecast, so a row is one index into all of
 * them at once. An element the API could not answer has an empty array, which
 * this reads as a missing value like any other.
 */
export function valueAt(
  elements: Map<string, ForecastElement>,
  key: string | undefined,
  index: number,
): number | null {
  if (!key) return null;
  return elements.get(key)?.data[index]?.value ?? null;
}

/** What a cell shows when the model has no value there. */
export const MISSING = "—";

/** "39.6" → "40 km/h", using the unit the API gave the element. */
export function formatValue(
  column: Column,
  element: ForecastElement | undefined,
  value: number | null,
): string {
  if (value === null || !Number.isFinite(value)) return MISSING;

  const scaled = value * (column.scale ?? 1);
  const unit = column.unit ?? element?.unit ?? "";
  const number = scaled.toFixed(column.decimals);
  return unit ? `${number} ${unit}` : number;
}

/**
 * One element's value written out on its own, for the elements that have no
 * column of their own: the decimals follow the size of the number, and a
 * direction is given its compass point as well.
 */
export function formatElement(
  element: ForecastElement,
  value: number | null,
): string {
  if (value === null || !Number.isFinite(value)) return MISSING;

  const unit = element.unit ?? "";
  if (unit === "°") return `${Math.round(value)}° ${compassPoint(value)}`;

  const decimals = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
  const number = Number(value.toFixed(decimals));
  return unit ? `${number} ${unit}` : String(number);
}

/** The elements of a response in the order they came, grouped by model. */
export function groupByModel(
  elements: ForecastElement[],
): { model: string; elements: ForecastElement[] }[] {
  const models: { model: string; elements: ForecastElement[] }[] = [];

  for (const element of elements) {
    const last = models.find((group) => group.model === element.model);
    if (last) last.elements.push(element);
    else models.push({ model: element.model, elements: [element] });
  }
  return models;
}

/** The 16-point compass, for the direction a wind or sea comes from. */
const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

/** 247 → "WSW". */
export function compassPoint(degrees: number | null): string {
  if (degrees === null || !Number.isFinite(degrees)) return "";
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

/* -------------------------------------------------------------------------
 * Time
 * ---------------------------------------------------------------------- */

/**
 * Everything on this page is in UTC — the departure that is entered, the
 * arrival times that come back, and the forecast hours along the way. A
 * voyage crosses time zones, so its own local time would keep changing, and
 * the ship's log keeps UTC for exactly that reason.
 */
export const TIME_ZONE = "UTC";

/** "14:00" */
export function formatTime(time: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(time * 1000);
}

/** "Thu 3 Sep" */
export function formatDay(time: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(time * 1000);
}

/** "Thu 3 Sep, 14:00 UTC" */
export function formatMoment(time: number): string {
  return `${formatDay(time)}, ${formatTime(time)} UTC`;
}

/** "2026-09-03", the day a moment falls on in UTC. */
export function dayKey(time: number): string {
  return new Date(time * 1000).toISOString().slice(0, 10);
}

/** Splits a run of rows into the UTC days they fall on, in order. */
export function groupByDay<T>(
  rows: T[],
  timeOf: (row: T) => number,
): { key: string; time: number; rows: T[] }[] {
  const days: { key: string; time: number; rows: T[] }[] = [];

  for (const row of rows) {
    const time = timeOf(row);
    const key = dayKey(time);
    const last = days[days.length - 1];
    if (last?.key === key) last.rows.push(row);
    else days.push({ key, time, rows: [row] });
  }
  return days;
}

/**
 * What a `datetime-local` field says, "2026-09-03T14:00", as a timestamp —
 * read as UTC rather than as the reader's own time, so the departure means
 * the same thing as every other moment on the page. An empty or half-typed
 * field is null, which the route reads as leaving now.
 *
 * The shape is checked before it is parsed rather than trusting `Date.parse`
 * to refuse what is not a date: it reads an empty field as ":00Z" and hands
 * back the first of January 2000 for it, which would quietly send a voyage
 * out a quarter of a century ago.
 */
const DATE_TIME_INPUT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function fromDateTimeInput(value: string): number | null {
  if (!DATE_TIME_INPUT.test(value)) return null;

  const time = Date.parse(`${value}:00Z`);
  return Number.isNaN(time) ? null : Math.floor(time / 1000);
}

/**
 * The other way round: a timestamp as a `datetime-local` field wants it, in
 * UTC to match how the field is read back. Used to open the example on the
 * current hour instead of on an empty field.
 */
export function toDateTimeInput(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 16);
}

/* -------------------------------------------------------------------------
 * Distances, speeds and positions
 * ---------------------------------------------------------------------- */

/** 360230 → "195 nm" */
export function formatDistance(metres: number): string {
  const miles = metres / METRES_PER_NAUTICAL_MILE;
  return `${miles.toFixed(miles < 10 ? 1 : 0)} nm`;
}

/** 23346 → "6 h 29 min" */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

/** 16 → "16 kn" */
export function formatSpeed(knots: number | null | undefined): string {
  if (knots === null || knots === undefined) return MISSING;
  return `${Number(knots.toFixed(1))} kn`;
}

/** "51.816 N, 2.259 E" */
export function formatCoordinates(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)} ${ns}, ${Math.abs(lon).toFixed(3)} ${ew}`;
}

/**
 * How far each position is from the departure, in metres.
 *
 * The API measures from the last waypoint rather than from the start: both
 * `distance` and `distanceTime` begin again at every waypoint, so a two-leg
 * voyage counts up twice. The waypoint that ends a leg is also the one the
 * next leg is measured from, so the legs are simply added up as they close.
 */
export function sailedDistances(points: RoutePoint[]): number[] {
  let sailedBefore = 0;

  return points.map((point, index) => {
    const sailed = sailedBefore + point.distance;
    if (point.type === "waypoint" && index > 0) sailedBefore = sailed;
    return sailed;
  });
}

/** The route's own waypoints, in the order they are sailed. */
export function waypointsOf(route: RouteForecast): RoutePoint[] {
  return route.points.filter((point) => point.type === "waypoint");
}

/**
 * Where the row of the point forecast nearest a moment sits, so the hour a
 * ship is somewhere can be marked among the hours around it.
 */
export function nearestTimeIndex(times: number[], time: number): number {
  let nearest = -1;
  let smallest = Infinity;

  times.forEach((candidate, index) => {
    const distance = Math.abs(candidate - time);
    if (distance < smallest) {
      smallest = distance;
      nearest = index;
    }
  });
  return nearest;
}
