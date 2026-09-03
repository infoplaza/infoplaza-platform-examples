import { platformGet, type Endpoint } from "@/lib/platform";
import {
  DEFAULT_LANGUAGE,
  dedupeWarnings,
  sortWarnings,
  type LanguageCode,
  type Warning,
} from "./utils";

/**
 * Server-side client for the Weather Warnings API.
 *
 * It is a plain REST endpoint that takes the API key as a query parameter, so
 * it is called from the server only and the browser talks to the route handler
 * in ./lookup instead. That keeps the key out of the client bundle.
 *
 * The call goes out through @/lib/platform, which attaches the key and records
 * the request and its answer for the API log at the bottom of the page.
 */

const WEATHER_WARNINGS: Endpoint = {
  name: "Weather Warnings",
  url: "https://api.infoplaza.com/v1/weather/warnings",
  docsUrl: "https://platform.infoplaza.com/reference/v1-weather-warnings",
};

/** What the endpoint answers with: the point asked for, and its warnings. */
interface WarningsData {
  latitude: number;
  longitude: number;
  language: string;
  /** Warnings before duplicates are collapsed, so it can exceed the list. */
  count: number;
  warnings: Warning[];
}

/**
 * The warnings in force for a point, severest first.
 *
 * A location can be covered by several services at once, and each of them
 * reissues a warning as its forecast firms up, so the same warning arrives
 * more than once: unchanged apart from a newer `created`, or simply repeated.
 * Showing those as separate rows would read as a dozen heat warnings where
 * there is one, so identical warnings are collapsed here and the most recent
 * issue is kept.
 *
 * Warnings that have not started yet come along with the active ones, marked
 * by `active: false`. They are kept, and the list marks them as upcoming.
 */
export async function weatherWarnings(
  latitude: number,
  longitude: number,
  language: LanguageCode = DEFAULT_LANGUAGE,
): Promise<Warning[]> {
  const data = await platformGet<WarningsData>(WEATHER_WARNINGS, {
    lat: String(latitude),
    lon: String(longitude),
    language,
  });

  return sortWarnings(dedupeWarnings(data.warnings ?? []));
}
