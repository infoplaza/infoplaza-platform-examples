/**
 * Client-side helpers and types for the Forecast example. The shapes below
 * cover the fields the Weather Forecast API returns for a location.
 *
 * Every number comes back in the metric system: °C, km/h, hPa, mm/hour,
 * meters, W/m². Fractions (humidity, cloud cover, precipitation probability)
 * are 0-1 rather than percentages. Nothing but `time` is guaranteed to be
 * there — a point far out at sea comes back without wind gusts or
 * precipitation — so every other field is optional here.
 */

/** A point on the map. */
export interface LatLon {
  latitude: number;
  longitude: number;
}

/** The conditions right now. Carries no `iconExtended`, unlike the rest. */
export interface Currently {
  /** Unix timestamp in seconds. */
  time: number;
  /** Basic icon set code, e.g. "B". */
  icon?: string;
  /** °C. */
  temperature?: number;
  /** Feels-like temperature, °C. */
  apparentTemperature?: number;
  /** °C. */
  dewPoint?: number;
  /** Relative humidity, 0-1. */
  humidity?: number;
  /** hPa. */
  pressure?: number;
  /** km/h. */
  windSpeed?: number;
  /** km/h. */
  windGust?: number;
  /** Degrees the wind blows from, 0-360. */
  windBearing?: number;
  /** 0-1. */
  cloudCover?: number;
  /** Meters. */
  visibility?: number;
  /** mm/hour. */
  precipIntensity?: number;
  /** 0-1. */
  precipProbability?: number;
  /** Kilometers. */
  nearestStormDistance?: number;
  /** Degrees, 0-360. */
  nearestStormBearing?: number;
}

/** One step of the precipitation forecast. Steps are five minutes apart. */
export interface Minute {
  time: number;
  /** mm/hour. */
  precipIntensity?: number;
  /** 0-1. */
  precipProbability?: number;
  /** "rain", "snow". */
  precipType?: string;
}

/** One hour of the forecast. */
export interface Hour {
  time: number;
  icon?: string;
  /** Extended icon set code, e.g. "A002D". Keys into CONDITIONS. */
  iconExtended?: string;
  temperature?: number;
  apparentTemperature?: number;
  dewPoint?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windGust?: number;
  windBearing?: number;
  cloudCover?: number;
  uvIndex?: number;
  visibility?: number;
  /** Solar global radiation, W/m². */
  globalRadiation?: number;
  precipIntensity?: number;
  precipProbability?: number;
  precipType?: string;
}

/** One part of a day: its morning, afternoon, evening or night. */
export interface Daypart {
  /** The day the part belongs to, not the moment the part starts. */
  time: number;
  name: string;
  icon?: string;
  iconExtended?: string;
  /** Average over the daypart, °C. */
  temperature?: number;
  windSpeed?: number;
  windGust?: number;
  windBearing?: number;
  cloudCover?: number;
  /** Highest UV index during the daypart. */
  uvIndex?: number;
  visibility?: number;
  /** Solar radiation over the daypart, Wh/m². */
  globalRadiationSum?: number;
  precipIntensity?: number;
  precipProbability?: number;
  precipType?: string;
}

/** One day of the forecast. */
export interface Day {
  time: number;
  icon?: string;
  iconExtended?: string;
  /** °C. */
  temperatureHigh?: number;
  /** °C. */
  temperatureLow?: number;
  apparentTemperature?: number;
  dewPoint?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windBearing?: number;
  cloudCover?: number;
  /** Highest UV index during the day. */
  uvIndex?: number;
  /** Solar radiation over the day, Wh/m². */
  globalRadiationSum?: number;
  precipIntensity?: number;
  precipProbability?: number;
  precipType?: string;
}

/** The whole answer for one location. */
export interface Forecast {
  /** Where the forecast is for, which is not quite where it was asked for. */
  latitude: number;
  longitude: number;
  location: string;
  country: string;
  /** IANA identifier, e.g. "Europe/Amsterdam". Every time is shown in it. */
  timezone: string;
  currently: Currently;
  minutely: Minute[];
  hourly: Hour[];
  daypartly: Daypart[];
  daily: Day[];
}

/** Houten, the point the API reference uses in its own example. */
export const DEFAULT_LOCATION: LatLon = {
  latitude: 52.02,
  longitude: 5.16,
};

/** The four blocks the forecast is shown in, one per tab. */
export type BlockName = "minutely" | "hourly" | "daypartly" | "daily";

interface Block {
  value: BlockName;
  label: string;
  /** What the block's `max_*` parameter counts. */
  unit: string;
  /** The sizes the picker offers: the API's default first, its ceiling last. */
  sizes: readonly number[];
}

/**
 * The blocks in the order the tabs offer them, each with the sizes it can be
 * asked for.
 *
 * The size of a block is a `max_*` parameter on the one call, so the four
 * travel together and every tab is filled by the same request. The first size
 * listed is the API's own default and the last is its ceiling: leaving all
 * four at their default keeps a call at 1 credit, and raising any single one
 * of them puts the whole call at 3, which the API log at the bottom of the
 * page reports back.
 *
 * `minutely` counts minutes rather than steps: the answer comes in
 * five-minute steps, so 60 returns twelve of them.
 */
export const BLOCKS: readonly Block[] = [
  {
    value: "minutely",
    label: "Minutely",
    unit: "minutes",
    sizes: [60, 90, 120],
  },
  {
    value: "hourly",
    label: "Hourly",
    unit: "hours",
    sizes: [48, 72, 120, 168],
  },
  {
    value: "daypartly",
    label: "Dayparts",
    unit: "dayparts",
    sizes: [8, 12, 20, 30],
  },
  { value: "daily", label: "Daily", unit: "days", sizes: [5, 7, 10, 15] },
];

/** How much of each block to ask for: one `max_*` parameter per block. */
export type ForecastSizes = Record<BlockName, number>;

/** The block a tab stands for, with its label and the sizes it offers. */
export function blockByName(name: BlockName): Block {
  return BLOCKS.find((block) => block.value === name) ?? BLOCKS[0];
}

/** The API's own defaults, which are the first size every block offers. */
export const FORECAST_DEFAULTS: ForecastSizes = Object.fromEntries(
  BLOCKS.map((block) => [block.value, block.sizes[0]]),
) as ForecastSizes;

/** Whether nothing is raised above its default, so the call costs 1 credit. */
export function isDefaultSizes(sizes: ForecastSizes): boolean {
  return BLOCKS.every(
    (block) => sizes[block.value] <= FORECAST_DEFAULTS[block.value],
  );
}

/**
 * The sizes a request asked for, kept inside what the API accepts.
 *
 * The panel only ever sends sizes from the lists above, but the route handler
 * is a URL anyone can type, so a missing, unreadable or out-of-range number
 * falls back to the default instead of reaching the API.
 */
export function readSizes(params: URLSearchParams): ForecastSizes {
  const sizes = { ...FORECAST_DEFAULTS };

  for (const block of BLOCKS) {
    const asked = params.get(block.value);
    if (!asked) continue;

    const size = Number(asked);
    const ceiling = block.sizes[block.sizes.length - 1];
    if (Number.isInteger(size) && size >= 0 && size <= ceiling) {
      sizes[block.value] = size;
    }
  }

  return sizes;
}

/* -------------------------------------------------------------------------
 * Time
 *
 * A forecast is read in the local time of the place it is for, not in the
 * timezone of whoever is looking at it: clicking Tokyo should show Tokyo's
 * hours. The API returns Unix timestamps plus the IANA zone they belong to,
 * so every formatter below takes that zone and hands it to Intl.
 * ---------------------------------------------------------------------- */

function formatter(
  timezone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, ...options });
}

/** 1786014000 → "14:00", in the forecast's own timezone. */
export function formatTime(time: number, timezone: string): string {
  return formatter(timezone, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(time * 1000);
}

/** 1786014000 → "2026-08-06". Sortable, and equal for two times on one day. */
export function dayKey(time: number, timezone: string): string {
  const parts = formatter(timezone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(time * 1000);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** "2026-08-06" → "2026-08-07". Calendar arithmetic, so DST cannot skew it. */
function nextDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/** 1786014000 → "Thu 6 Aug". */
export function formatDate(time: number, timezone: string): string {
  return formatter(timezone, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(time * 1000);
}

/**
 * "Today", "Tomorrow" or "Thu 6 Aug".
 *
 * Which day counts as today is taken from the forecast rather than from the
 * clock, so the label is the same on the server and in the browser and cannot
 * disagree with the hour the API calls the current one.
 */
export function formatDay(
  time: number,
  timezone: string,
  today: number,
): string {
  const key = dayKey(time, timezone);
  const todayKey = dayKey(today, timezone);
  if (key === todayKey) return "Today";
  if (key === nextDayKey(todayKey)) return "Tomorrow";
  return formatDate(time, timezone);
}

/** Splits a list of periods into consecutive runs of the same day. */
export function groupByDay<T extends { time: number }>(
  periods: T[],
  timezone: string,
): { key: string; time: number; periods: T[] }[] {
  const days: { key: string; time: number; periods: T[] }[] = [];
  for (const period of periods) {
    const key = dayKey(period.time, timezone);
    const last = days[days.length - 1];
    if (last && last.key === key) last.periods.push(period);
    else days.push({ key, time: period.time, periods: [period] });
  }
  return days;
}

/* -------------------------------------------------------------------------
 * Values
 * ---------------------------------------------------------------------- */

/** What every formatter below shows for a field the API left out. */
export const MISSING = "–";

/** 22.4 → "22°" */
export function formatTemperature(celsius: number | undefined): string {
  if (celsius === undefined) return MISSING;
  return `${Math.round(celsius)}°`;
}

/** 0.44 → "44%" */
export function formatFraction(fraction: number | undefined): string {
  if (fraction === undefined) return MISSING;
  return `${Math.round(fraction * 100)}%`;
}

/** 6.5 → "7 km/h" */
export function formatWind(kmh: number | undefined): string {
  if (kmh === undefined) return MISSING;
  return `${Math.round(kmh)} km/h`;
}

/** 0.35 → "0.4 mm/h", 12 → "12 mm/h" */
export function formatIntensity(mmPerHour: number | undefined): string {
  if (mmPerHour === undefined) return MISSING;
  const rounded = mmPerHour >= 10 ? Math.round(mmPerHour) : mmPerHour.toFixed(1);
  return `${rounded} mm/h`;
}

/** 31800 → "31.8 km", 800 → "800 m" */
export function formatVisibility(meters: number | undefined): string {
  if (meters === undefined) return MISSING;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/** 3.94 → "3.9", 6 → "6" */
export function formatUvIndex(index: number | undefined): string {
  if (index === undefined) return MISSING;
  return index >= 10 || Number.isInteger(index)
    ? String(Math.round(index))
    : index.toFixed(1);
}

/**
 * The WHO exposure bands the UV index is read in. A value at or above the
 * `from` of a band is in it, so the list is walked from the top down.
 */
const UV_BANDS: { from: number; label: string }[] = [
  { from: 11, label: "Extreme" },
  { from: 8, label: "Very high" },
  { from: 6, label: "High" },
  { from: 3, label: "Moderate" },
  { from: 0, label: "Low" },
];

/** 6.4 → "High" */
export function uvBand(index: number | undefined): string {
  if (index === undefined) return MISSING;
  return UV_BANDS.find((band) => index >= band.from)?.label ?? "Low";
}

/** The 16-point compass, starting at north and turning clockwise. */
const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

/** 255.9 → "W". The bearing is the direction the wind blows from. */
export function compassPoint(bearing: number | undefined): string {
  if (bearing === undefined) return MISSING;
  const step = 360 / COMPASS.length;
  return COMPASS[Math.round(bearing / step) % COMPASS.length];
}

/** "morning" → "Morning" */
export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** "52.02000, 5.16000" */
export function formatCoordinates(point: LatLon): string {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

/* -------------------------------------------------------------------------
 * Reading the forecast
 * ---------------------------------------------------------------------- */

/**
 * The hour the current conditions fall in, or null when there is none.
 *
 * `currently` carries the basic icon code but no `iconExtended`, and no UV
 * index, so the hour around it is what supplies both. It is a lookup rather
 * than an index because `currently.time` is not always on the hour.
 */
export function hourAround(forecast: Forecast): Hour | null {
  let closest: Hour | null = null;
  let smallest = Infinity;
  for (const hour of forecast.hourly) {
    const distance = Math.abs(hour.time - forecast.currently.time);
    if (distance < smallest) {
      smallest = distance;
      closest = hour;
    }
  }
  // An hour more than an hour away is a different hour, not this one.
  return smallest <= 3600 ? closest : null;
}

/** The step of the precipitation forecast with the most rain or snow in it. */
export function peakMinute(minutes: Minute[]): Minute | null {
  let peak: Minute | null = null;
  for (const minute of minutes) {
    if ((minute.precipIntensity ?? 0) > (peak?.precipIntensity ?? 0)) {
      peak = minute;
    }
  }
  return peak;
}

/**
 * The precipitation forecast in a sentence, so its numbers can be read
 * without going through the chart.
 *
 * The two series it summarises answer different questions: the intensity says
 * how hard it would come down, the probability how likely that is at all. A
 * dry stretch has a probability worth mentioning and no intensity to speak
 * of, which is why both get a clause.
 */
export function precipitationSummary(
  minutes: Minute[],
  timezone: string,
): string {
  if (minutes.length === 0) return "";

  const peak = peakMinute(minutes);
  const chance = minutes.reduce(
    (highest, minute) => Math.max(highest, minute.precipProbability ?? 0),
    0,
  );
  const span = Math.round(
    (minutes[minutes.length - 1].time - minutes[0].time) / 60 + 5,
  );
  const window = `the next ${span} minutes`;

  if (!peak || !peak.precipIntensity) {
    if (chance === 0) return `Nothing falling in ${window}.`;
    return `Nothing falling in ${window}, though the chance of precipitation reaches ${formatFraction(chance)}.`;
  }

  const type = peak.precipType ?? "precipitation";
  const first = minutes.find((minute) => (minute.precipIntensity ?? 0) > 0);
  const start =
    first && first !== minutes[0]
      ? `${capitalize(type)} from ${formatTime(first.time, timezone)}`
      : `${capitalize(type)} falling now`;

  return `${start}, heaviest at ${formatTime(peak.time, timezone)} with ${formatIntensity(peak.precipIntensity)}. Chance of precipitation peaks at ${formatFraction(chance)}.`;
}

/**
 * Colour stops a temperature is read off, from freezing blue to hot red.
 * Anything below or above the ends keeps the end colour. The Climate example
 * colours its temperature bars off the same stops, so the two examples read
 * a degree the same way.
 */
const TEMPERATURE_STOPS: [number, string][] = [
  [-20, "#1d4ed8"],
  [0, "#60a5fa"],
  [12, "#fbbf24"],
  [25, "#f97316"],
  [35, "#dc2626"],
];

/** A temperature, as a colour from the stops above. */
export function temperatureColor(celsius: number): string {
  const first = TEMPERATURE_STOPS[0];
  const last = TEMPERATURE_STOPS[TEMPERATURE_STOPS.length - 1];
  if (celsius <= first[0]) return first[1];
  if (celsius >= last[0]) return last[1];

  for (let index = 1; index < TEMPERATURE_STOPS.length; index += 1) {
    const [toValue, toColor] = TEMPERATURE_STOPS[index];
    if (celsius > toValue) continue;
    const [fromValue, fromColor] = TEMPERATURE_STOPS[index - 1];
    return mixColors(
      fromColor,
      toColor,
      (celsius - fromValue) / (toValue - fromValue),
    );
  }
  return last[1];
}

/** Blends two "#rrggbb" colours, `amount` of the way from the first to the second. */
function mixColors(from: string, to: string, amount: number): string {
  const channels = [1, 3, 5].map((offset) => {
    const start = parseInt(from.slice(offset, offset + 2), 16);
    const end = parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * amount);
  });
  return `rgb(${channels.join(" ")})`;
}
