import { FORECAST_LIMITS, type Forecast } from "./utils";

/**
 * Server-side client for the Weather Forecast API.
 *
 * It is a plain REST endpoint that takes the API key as a query parameter, so
 * it is called from the server only and the browser talks to the route handler
 * in ./lookup instead. That keeps the key out of the client bundle.
 *
 * API reference: https://platform.infoplaza.com/reference/v1-weather-forecast
 */

const WEATHER_FORECAST_URL = "https://api.infoplaza.com/v1/weather/forecast";

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
 * The whole forecast for a point: what it is doing now, then the next hours,
 * dayparts and days.
 *
 * One call answers with all five blocks at once, sized by the `max_*`
 * parameters — so the four tabs the example shows cost one request between
 * them, not one each. The sizes come from FORECAST_LIMITS, which stays at the
 * API's own defaults to keep a call at 1 credit.
 *
 * The point in the answer is not the point that was asked for: the API snaps
 * to the nearest place it forecasts for, which over open sea can be hundreds
 * of kilometres away. `latitude`, `longitude` and `location` say where it
 * landed, and the example shows both.
 */
export async function weatherForecast(
  latitude: number,
  longitude: number,
): Promise<Forecast> {
  const url = new URL(WEATHER_FORECAST_URL);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("max_minutely", String(FORECAST_LIMITS.minutely));
  url.searchParams.set("max_hourly", String(FORECAST_LIMITS.hourly));
  url.searchParams.set("max_daily", String(FORECAST_LIMITS.daily));
  url.searchParams.set("max_daypartly", String(FORECAST_LIMITS.daypartly));
  url.searchParams.set("api_key", requireApiKey());

  const response = await fetch(url, { cache: "no-store" });
  const body = (await response
    .json()
    .catch(() => null)) as PlatformResponse<Partial<Forecast>> | null;

  if (!response.ok || !body?.success || !body.data) {
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${response.status}.`,
    );
  }

  // A block the API has nothing for is left out rather than sent empty, and a
  // location with no radar coverage has no minutely block at all, so the
  // arrays are filled in here and the rest of the example can stop checking.
  const data = body.data;
  return {
    latitude: data.latitude ?? latitude,
    longitude: data.longitude ?? longitude,
    location: data.location ?? "",
    country: data.country ?? "",
    timezone: data.timezone || "UTC",
    currently: data.currently ?? { time: Math.floor(Date.now() / 1000) },
    minutely: data.minutely ?? [],
    hourly: data.hourly ?? [],
    daypartly: data.daypartly ?? [],
    daily: data.daily ?? [],
  };
}
