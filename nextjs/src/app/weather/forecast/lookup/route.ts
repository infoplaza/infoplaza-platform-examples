import { apiRoute, HttpError } from "@/lib/platform";
import { weatherForecast } from "../api";
import { readSizes } from "../utils";

/**
 * Forecast proxy for the map.
 *
 * The browser calls this route with the coordinates that were picked on the
 * map; it forwards them to the Weather Forecast API with the API key from
 * INFOPLAZA_API_KEY and returns the forecast it gets back. The key stays
 * server-side.
 *
 * The picker beside the tabs sends how much of each block it wants along with
 * the coordinates, one parameter per block. `readSizes` keeps those inside
 * what the API accepts, since this route is a URL anyone can type.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load the forecast.", async (request) => {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HttpError(400, "lat and lon are required and must be numbers.");
  }

  return {
    forecast: await weatherForecast(latitude, longitude, readSizes(params)),
  };
});
