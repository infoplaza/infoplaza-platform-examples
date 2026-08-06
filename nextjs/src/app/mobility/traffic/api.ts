import type { GeoFeature, OverviewEvent, TrafficSummary } from "./utils";

/**
 * Server-side clients for the two Traffic APIs this example uses.
 *
 * Both are plain REST endpoints that take the API key as a query parameter
 * and no other parameters: each call returns every current traffic event in
 * the Netherlands. They are called during server rendering only, so the key
 * never reaches the browser.
 *
 * API reference: https://platform.infoplaza.com/reference/v1-traffic-geo
 * API reference: https://platform.infoplaza.com/reference/v1-traffic-overview
 */

const TRAFFIC_GEO_URL = "https://api.infoplaza.com/v1/traffic/geo";
const TRAFFIC_OVERVIEW_URL = "https://api.infoplaza.com/v1/traffic/overview";

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
async function platformGet<T>(endpoint: string): Promise<T> {
  const url = new URL(endpoint);
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
 * Current traffic events as GeoJSON. Jams and roadworks that span a stretch
 * of road come back as a LineString, single-spot events as a Point.
 */
export async function trafficGeo(): Promise<GeoFeature[]> {
  const data = await platformGet<{ features?: GeoFeature[] }>(TRAFFIC_GEO_URL);
  return data.features ?? [];
}

/**
 * The same events as records, with the delay and queue length the GeoJSON
 * leaves out, plus the nationwide totals.
 */
export async function trafficOverview(): Promise<{
  events: OverviewEvent[];
  summary: TrafficSummary;
}> {
  const data = await platformGet<{
    events?: OverviewEvent[];
    summary: TrafficSummary;
  }>(TRAFFIC_OVERVIEW_URL);

  return { events: data.events ?? [], summary: data.summary };
}
