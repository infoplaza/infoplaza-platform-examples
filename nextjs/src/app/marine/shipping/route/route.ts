import { apiRoute, HttpError } from "@/lib/platform";
import { shippingRoute } from "../api";
import { isRouting } from "../utils";

/**
 * Route forecast proxy for the map.
 *
 * The browser calls this route with the waypoints on the map and the settings
 * under it; it forwards them to the Shipping Route API with the API key from
 * INFOPLAZA_API_KEY and returns the forecast along the track. The key stays
 * server-side.
 *
 * A missing departure is passed on as a missing one: the API reads that as
 * leaving now.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load the route.", async (request) => {
  const params = new URL(request.url).searchParams;

  const lats = numbers(params.get("lats"));
  const lons = numbers(params.get("lons"));
  // An empty parameter is a departure that was never filled in, not a
  // departure of zero.
  const start = params.get("start") || null;
  const speed = Number(params.get("speed"));
  const routing = params.get("routing") ?? "";

  if (lats.length < 2 || lats.length !== lons.length) {
    throw new HttpError(
      400,
      "lats and lons are required, as at least two positions each.",
    );
  }
  // No departure at all is a departure now, which is what the API itself
  // does with the parameter left off.
  if (start !== null && !Number.isInteger(Number(start))) {
    throw new HttpError(400, "start must be a unix timestamp in seconds.");
  }
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new HttpError(
      400,
      "speed is required and must be a positive number of knots.",
    );
  }
  if (!isRouting(routing)) {
    throw new HttpError(400, 'routing must be "rhumb" or "greatcircle".');
  }

  return {
    route: await shippingRoute({
      lats,
      lons,
      start: start === null ? null : Number(start),
      speed,
      routing,
    }),
  };
});

/**
 * "51.816,54.147" → [51.816, 54.147].
 *
 * One unparsable value fails the whole list rather than dropping out of it:
 * a latitude quietly missing from the middle would pair every position after
 * it with the wrong longitude.
 */
function numbers(value: string | null): number[] {
  if (!value) return [];

  const parsed = value.split(",").map((part) => Number(part.trim()));
  return parsed.every(Number.isFinite) ? parsed : [];
}
