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
 * API reference: https://platform.infoplaza.com/reference/v1-weather-warnings
 */

const WEATHER_WARNINGS_URL = "https://api.infoplaza.com/v1/weather/warnings";

function requireApiKey(): string {
  const apiKey = process.env.INFOPLAZA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "INFOPLAZA_API_KEY is not set. Copy .env.example to .env.local and add your API key.",
    );
  }
  return apiKey;
}

/** Envelope every Platform REST endpoint wraps its payload in. */
interface PlatformResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

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
  const url = new URL(WEATHER_WARNINGS_URL);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("language", language);
  url.searchParams.set("api_key", requireApiKey());

  const response = await fetch(url, { cache: "no-store" });
  const body = (await response
    .json()
    .catch(() => null)) as PlatformResponse<WarningsData> | null;

  if (!response.ok || !body?.success || !body.data) {
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${response.status}.`,
    );
  }
  return sortWarnings(dedupeWarnings(body.data.warnings ?? []));
}
