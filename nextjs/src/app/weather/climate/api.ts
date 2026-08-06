import type { Climate, Granularity } from "./utils";

/**
 * Server-side client for the Weather Climate API.
 *
 * It is a plain REST endpoint that takes the API key as a query parameter, so
 * it is called from the server only and the browser talks to the route handler
 * in ./normals instead. That keeps the key out of the client bundle.
 *
 * API reference: https://platform.infoplaza.com/reference/v1-weather-climate
 */

const WEATHER_CLIMATE_URL = "https://api.infoplaza.com/v1/weather/climate";

/**
 * Thrown when the API has no climate year for the point that was asked for.
 * The panel turns this into a hint instead of an error, because it is the one
 * failure a click on the map can cause on its own.
 */
export class NoClimateDataError extends Error {
  constructor() {
    super("The API has no climate data for this location.");
    this.name = "NoClimateDataError";
  }
}

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

/**
 * The climate year at a point: what an average January, or first half of
 * January, or first ten days of January look like there.
 *
 * Coverage is not the whole globe, and a point outside it comes back as a 500
 * rather than as an empty result, so that case is turned into a
 * NoClimateDataError. Everything else, a missing or wrong key above all, keeps
 * the message the API sent.
 */
export async function climateNormals(
  latitude: number,
  longitude: number,
  granularity: Granularity,
): Promise<Climate> {
  const url = new URL(WEATHER_CLIMATE_URL);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("period", granularity);
  url.searchParams.set("api_key", requireApiKey());

  const response = await fetch(url, { cache: "no-store" });
  const body = (await response
    .json()
    .catch(() => null)) as PlatformResponse<Climate> | null;

  if (!response.ok || !body?.success) {
    if (response.status >= 500) throw new NoClimateDataError();
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${response.status}.`,
    );
  }
  if (!body.data?.periods?.length) throw new NoClimateDataError();

  return body.data;
}
