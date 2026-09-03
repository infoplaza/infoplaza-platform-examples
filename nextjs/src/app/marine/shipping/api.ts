import { platformGet, type Endpoint } from "@/lib/platform";
import type { PointForecast, RouteForecast, Routing } from "./utils";

/**
 * Server-side client for the Shipping Point and Shipping Route APIs.
 *
 * Both are plain REST endpoints that take the API key as a query parameter,
 * so they are called from the server only and the browser talks to the route
 * handlers in ./point and ./route instead. That keeps the key out of the
 * client bundle.
 *
 * The calls go out through @/lib/platform, which attaches the key and records
 * each request and its answer for the API log at the bottom of the page.
 */

const SHIPPING_POINT: Endpoint = {
  name: "Shipping Point",
  url: "https://api.infoplaza.com/v1/marine/shipping/point",
  docsUrl:
    "https://platform.infoplaza.com/reference/v1-marine-shipping-point",
};

const SHIPPING_ROUTE: Endpoint = {
  name: "Shipping Route",
  url: "https://api.infoplaza.com/v1/marine/shipping/route",
  docsUrl:
    "https://platform.infoplaza.com/reference/v1-marine-shipping-route",
};

/**
 * A forecast from one of the two endpoints.
 *
 * A request these two will not take — a speed for the wrong number of legs, a
 * position off the grid — is not an HTTP error to them: they answer 200 with
 * `success: true` and an `error` string where the forecast should be. That
 * case is turned into a real failure here, so the caller only ever gets a
 * forecast or an exception.
 */
async function shippingGet<T extends object>(
  endpoint: Endpoint,
  params: Record<string, string>,
): Promise<T> {
  const data = await platformGet<T | { error: string }>(endpoint, params);

  if ("error" in data) throw new Error(String(data.error));
  return data as T;
}

/**
 * The full forecast at one position: wind, waves, swell, sea temperature and
 * the rest, every model timestep out to about fifteen days.
 *
 * Nothing is asked about time here — the endpoint hands over the whole run,
 * including the timesteps before the model ran, whose values come back null.
 */
export async function shippingPoint(
  lat: number,
  lon: number,
): Promise<PointForecast> {
  return shippingGet<PointForecast>(SHIPPING_POINT, {
    lat: String(lat),
    lon: String(lon),
  });
}

/** A voyage: where it goes, when it leaves, how fast and along which lines. */
export interface RouteRequest {
  lats: number[];
  lons: number[];
  /** Departure, unix seconds. Null leaves now, as the API does by default. */
  start: number | null;
  /** One speed for the whole voyage, in knots. */
  speed: number;
  routing: Routing;
}

/**
 * The forecast along a track: the same elements as a point forecast, but each
 * value taken where and when the ship is there.
 *
 * The endpoint wants a speed per leg rather than one for the voyage — it will
 * take a value for every waypoint or one fewer, and nothing else — so the
 * single speed this example offers is repeated across the legs here. It
 * answers with the waypoints and, between them, a position for every model
 * hour the ship sails through.
 *
 * `speeds` is in knots, whatever the reference says: a voyage asked for at 30
 * comes back covering 15.4 metres a second, which is 30 knots and not 30
 * km/h.
 */
export async function shippingRoute({
  lats,
  lons,
  start,
  speed,
  routing,
}: RouteRequest): Promise<RouteForecast> {
  const legs = Math.max(lats.length - 1, 1);

  return shippingGet<RouteForecast>(SHIPPING_ROUTE, {
    lats: lats.join(","),
    lons: lons.join(","),
    ...(start === null ? {} : { start: String(start) }),
    speeds: Array(legs).fill(String(speed)).join(","),
    routing,
  });
}
