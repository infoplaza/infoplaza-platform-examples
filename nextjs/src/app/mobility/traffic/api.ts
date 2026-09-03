import { platformGet, type Endpoint } from "@/lib/platform";
import type { GeoFeature, OverviewEvent, TrafficSummary } from "./utils";

/**
 * Server-side clients for the two Traffic APIs this example uses.
 *
 * Both are plain REST endpoints that take the API key as a query parameter
 * and no other parameters: each call returns every current traffic event in
 * the Netherlands. They are called from the route handler only, so the key
 * never reaches the browser.
 *
 * The calls go out through @/lib/platform, which attaches the key and records
 * each request and its answer for the API log at the bottom of the page.
 */

const TRAFFIC_GEO: Endpoint = {
  name: "Traffic Geo",
  url: "https://api.infoplaza.com/v1/traffic/geo",
  docsUrl: "https://platform.infoplaza.com/reference/v1-traffic-geo",
};

const TRAFFIC_OVERVIEW: Endpoint = {
  name: "Traffic Overview",
  url: "https://api.infoplaza.com/v1/traffic/overview",
  docsUrl: "https://platform.infoplaza.com/reference/v1-traffic-overview",
};

/**
 * Current traffic events as GeoJSON. Jams and roadworks that span a stretch
 * of road come back as a LineString, single-spot events as a Point.
 */
export async function trafficGeo(): Promise<GeoFeature[]> {
  const data = await platformGet<{ features?: GeoFeature[] }>(TRAFFIC_GEO);
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
  }>(TRAFFIC_OVERVIEW);

  return { events: data.events ?? [], summary: data.summary };
}
