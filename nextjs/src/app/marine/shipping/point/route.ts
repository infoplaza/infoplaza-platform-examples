import { apiRoute, HttpError } from "@/lib/platform";
import { shippingPoint } from "../api";

/**
 * Point forecast proxy for the map.
 *
 * The browser calls this route with the position of the waypoint that was
 * clicked; it forwards it to the Shipping Point API with the API key from
 * INFOPLAZA_API_KEY and returns the forecast for that spot. The key stays
 * server-side.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load the forecast.", async (request) => {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new HttpError(400, "lat and lon are required and must be numbers.");
  }

  return { forecast: await shippingPoint(lat, lon) };
});
