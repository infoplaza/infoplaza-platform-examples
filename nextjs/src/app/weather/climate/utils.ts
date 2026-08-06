/**
 * Client-side helpers and types for the Climate example. The shapes below
 * cover the fields the Weather Climate API returns for a location.
 */

/** A point on the map. */
export interface LatLon {
  latitude: number;
  longitude: number;
}

/** The granularity the API splits the year into. */
export type Granularity = "month" | "half_month" | "ten_days";

/** One period of the climate year, as the API returns it. */
export interface ClimatePeriod {
  /** 1-12. */
  month: number;
  /** Which slice of that month: always 1 for "month", 1-2 or 1-3 otherwise. */
  period: number;
  /** Average daily maximum, °C. */
  temperatureHigh: number;
  /** Average daily minimum, °C. */
  temperatureLow: number;
  /** Total rainfall over the period, mm. */
  precipitationSum: number;
  /**
   * Average sunshine duration per day, in seconds, despite the name. The
   * reference calls these hours, but 8363 for January in the Netherlands only
   * makes sense read as seconds: 2.3 hours a day, and 2064 hours over the
   * year, which is the order the rest of the numbers agree with. Run it
   * through `sunHoursPerDay` before showing it.
   */
  sunshineHours: number;
  /** Average wind speed, m/s. */
  windSpeed: number;
  /** Average wind gust, m/s. */
  windGust: number;
}

/** The climate year for one location. */
export interface Climate {
  latitude: number;
  longitude: number;
  period: Granularity;
  periods: ClimatePeriod[];
}

/** The granularities the example offers, in the order they are shown. */
export const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "month", label: "Monthly" },
  { value: "half_month", label: "Half-monthly" },
  { value: "ten_days", label: "Ten-day" },
];

export const DEFAULT_GRANULARITY: Granularity = "month";

/** Houten, the point the API reference uses in its own example. */
export const DEFAULT_LOCATION: LatLon = {
  latitude: 52.02,
  longitude: 5.16,
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Days per month, ignoring leap years: a climate average spans many of both. */
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 1 → "January" */
export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

/** 1 → "Jan" */
export function monthAbbreviation(month: number): string {
  return monthName(month).slice(0, 3);
}

/** How many days the period covers, which is what the daily averages weigh. */
export function periodDays(
  period: ClimatePeriod,
  granularity: Granularity,
): number {
  const days = MONTH_LENGTHS[period.month - 1] ?? 30;
  if (granularity === "month") return days;
  if (granularity === "half_month") return period.period === 1 ? 15 : days - 15;
  return period.period === 3 ? days - 20 : 10;
}

/** The first and last day of the month the period covers. */
function periodRange(
  period: ClimatePeriod,
  granularity: Granularity,
): [number, number] {
  const days = MONTH_LENGTHS[period.month - 1] ?? 30;
  if (granularity === "month") return [1, days];
  if (granularity === "half_month") {
    return period.period === 1 ? [1, 15] : [16, days];
  }
  const first = (period.period - 1) * 10 + 1;
  return [first, period.period === 3 ? days : first + 9];
}

/** "January", "1–15 January" or "11–20 January", depending on granularity. */
export function periodLabel(
  period: ClimatePeriod,
  granularity: Granularity,
): string {
  if (granularity === "month") return monthName(period.month);
  const [from, to] = periodRange(period, granularity);
  return `${from}–${to} ${monthName(period.month)}`;
}

/** The same label, shortened for narrow table cells: "11–20 Jan". */
export function periodShortLabel(
  period: ClimatePeriod,
  granularity: Granularity,
): string {
  if (granularity === "month") return monthName(period.month);
  const [from, to] = periodRange(period, granularity);
  return `${from}–${to} ${monthAbbreviation(period.month)}`;
}

const SECONDS_PER_HOUR = 3600;

/** The API's seconds of sunshine per day, as hours per day. */
export function sunHoursPerDay(period: ClimatePeriod): number {
  return period.sunshineHours / SECONDS_PER_HOUR;
}

/** What one climate year adds up to, for the tiles above the charts. */
export interface ClimateSummary {
  /** The period with the highest average daily maximum. */
  warmest: ClimatePeriod;
  /** The period with the lowest average daily minimum. */
  coldest: ClimatePeriod;
  /** Total rainfall over the year, mm. */
  precipitation: number;
  /** Total sunshine over the year, hours. */
  sunshine: number;
  /** Mean of the daily minimum and maximum across the year, °C. */
  temperature: number;
}

/**
 * Sums the year up. Rainfall is a total per period, so the periods add up
 * straight; sunshine is a daily average, so each period counts for the number
 * of days it spans.
 */
export function summarize(
  periods: ClimatePeriod[],
  granularity: Granularity,
): ClimateSummary | null {
  if (periods.length === 0) return null;

  let precipitation = 0;
  let sunshine = 0;
  let temperatureDays = 0;
  let days = 0;
  let warmest = periods[0];
  let coldest = periods[0];

  for (const period of periods) {
    const spanned = periodDays(period, granularity);
    precipitation += period.precipitationSum;
    sunshine += sunHoursPerDay(period) * spanned;
    temperatureDays +=
      ((period.temperatureLow + period.temperatureHigh) / 2) * spanned;
    days += spanned;

    if (period.temperatureHigh > warmest.temperatureHigh) warmest = period;
    if (period.temperatureLow < coldest.temperatureLow) coldest = period;
  }

  return {
    warmest,
    coldest,
    precipitation,
    sunshine,
    temperature: temperatureDays / days,
  };
}

/** "52.02000, 5.16000" */
export function formatCoordinates(point: LatLon): string {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

/** 6.16 → "6.2°" */
export function formatTemperature(celsius: number): string {
  return `${celsius.toFixed(1)}°`;
}

/** 5.96 → "6.0 m/s" */
export function formatWind(metersPerSecond: number): string {
  return `${metersPerSecond.toFixed(1)} m/s`;
}
