import { platformGet, type Endpoint } from "@/lib/platform";
import type { Departure, StopPlace } from "./utils";

/**
 * Server-side clients for the two Transit Stop APIs this example uses.
 *
 * Both are plain REST endpoints that take the API key as a query parameter,
 * so they are called from the server only and the browser talks to the route
 * handlers in ./nearby and ./departures instead. That keeps the key out of
 * the client bundle.
 *
 * The calls go out through @/lib/platform, which attaches the key and records
 * each request and its answer for the API log at the bottom of the page.
 */

const STOP_NEARBY: Endpoint = {
  name: "Transit Stop Nearby",
  url: "https://api.infoplaza.com/v1/transit/stop/nearby",
  docsUrl: "https://platform.infoplaza.com/reference/v1-transit-stop-nearby",
};

const STOP_DEPARTURES: Endpoint = {
  name: "Transit Stop Departures",
  url: "https://api.infoplaza.com/v1/transit/stop/departures",
  docsUrl:
    "https://platform.infoplaza.com/reference/v1-transit-stop-departures",
};

/**
 * Transit stops around a point. The API widens its own radius when the area
 * is quiet: stops within 1000 m if at least three lines serve them, up to
 * 5000 m otherwise.
 */
export async function nearbyStops(
  latitude: number,
  longitude: number,
): Promise<StopPlace[]> {
  const data = await platformGet<{ stopplaces?: StopPlace[] }>(STOP_NEARBY, {
    lat: String(latitude),
    lon: String(longitude),
  });
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
  }>(STOP_DEPARTURES, { stopplace_id: stopPlaceId });

  return { stopplace: data.stopplace, departures: data.departures ?? [] };
}
