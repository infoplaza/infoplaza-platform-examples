import { apiRoute, HttpError } from "@/lib/platform";
import { observationsAtPoint } from "../api";
import { isDistance, isSourceId } from "../utils";

/**
 * Point proxy for the map.
 *
 * The browser calls this route with the network and the spot that was
 * clicked; it forwards them to the Observations Point API with the API key
 * from INFOPLAZA_API_KEY and returns the nearest station and its latest
 * observation. The key stays server-side.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to look up the point.", async (request) => {
  const params = new URL(request.url).searchParams;
  const source = params.get("source") ?? "";
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const maxDistance = Number(params.get("maxDistance"));

  if (!isSourceId(source)) {
    throw new HttpError(400, "source is required.");
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HttpError(400, "lat and lon are required and must be numbers.");
  }
  // Only the distances the select offers, which are all within the 100 km
  // the endpoint accepts.
  if (!isDistance(maxDistance)) {
    throw new HttpError(400, "maxDistance must be one of the offered options.");
  }

  return await observationsAtPoint(source, latitude, longitude, maxDistance);
});
