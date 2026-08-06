import type { Departure, StopPlace } from "./utils";

/**
 * Server-side clients for the two Transit Stop APIs this example uses.
 *
 * Both are plain REST endpoints that take the API key as a query parameter,
 * so they are called from the server only and the browser talks to the route
 * handlers in ./nearby and ./departures instead. That keeps the key out of
 * the client bundle.
 *
 * API reference: https://platform.infoplaza.com/reference/v1-transit-stop-nearby
 * API reference: https://platform.infoplaza.com/reference/v1-transit-stop-departures
 */

const STOP_NEARBY_URL = "https://api.infoplaza.com/v1/transit/stop/nearby";
const STOP_DEPARTURES_URL =
  "https://api.infoplaza.com/v1/transit/stop/departures";

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

/** Calls a Platform endpoint with the API key attached and unwraps `data`. */
async function platformGet<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", requireApiKey());

  const response = await fetch(url, { cache: "no-store" });
  const body = (await response
    .json()
    .catch(() => null)) as PlatformResponse<T> | null;

  if (!response.ok || !body?.success || !body.data) {
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${response.status}.`,
    );
  }
  return body.data;
}

/**
 * Transit stops around a point. The API widens its own radius when the area
 * is quiet: stops within 1000 m if at least three lines serve them, up to
 * 5000 m otherwise.
 */
export async function nearbyStops(
  latitude: number,
  longitude: number,
): Promise<StopPlace[]> {
  const data = await platformGet<{ stopplaces?: StopPlace[] }>(
    STOP_NEARBY_URL,
    { lat: String(latitude), lon: String(longitude) },
  );
  return data.stopplaces ?? [];
}

/**
 * Departures leaving one stop place in the next hour. A stop place groups the
 * physical quays that sit close together, so a single call covers both
 * directions of a street or all the platforms of a station.
 */
export async function stopDepartures(stopPlaceId: string): Promise<{
  stopplace: StopPlace;
  departures: Departure[];
}> {
  const data = await platformGet<{
    stopplace: StopPlace;
    departures?: Departure[];
  }>(STOP_DEPARTURES_URL, { stopplace_id: stopPlaceId });

  return { stopplace: data.stopplace, departures: data.departures ?? [] };
}
