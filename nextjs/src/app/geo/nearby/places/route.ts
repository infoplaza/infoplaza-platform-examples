import { apiRoute, HttpError } from "@/lib/platform";
import { nearbyPlaces } from "../api";

/**
 * Nearby-places proxy for the map.
 *
 * The browser calls this route with the coordinates that were picked on the
 * map; it forwards them to the Geo Nearby API with the API key from
 * INFOPLAZA_API_KEY and returns the places it finds. The key stays server-side.
 *
 * One lookup is one call per radius, and `apiRoute` adds all of them to the
 * answer so the API log on the page can show the fan-out.
 */
export const GET = apiRoute("Failed to load nearby places.", async (request) => {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HttpError(400, "lat and lon are required and must be numbers.");
  }

  return { places: await nearbyPlaces(latitude, longitude) };
});
