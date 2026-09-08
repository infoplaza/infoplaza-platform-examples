import { apiRoute, HttpError } from "@/lib/platform";
import { nearbyPlace } from "../api";
import { isRadiusOption, RADIUS_OPTIONS } from "../utils";

/**
 * Nearby-place proxy for the map.
 *
 * The browser calls this route with the coordinates that were picked on the
 * map and the radius that is selected beside it; it forwards them to the Geo
 * Nearby API with the API key from INFOPLAZA_API_KEY and returns the place it
 * finds, or null when there is none. The key stays server-side.
 *
 * One lookup is one call, and `apiRoute` adds it to the answer so the API log
 * on the page can show it.
 */
export const GET = apiRoute(
  "Failed to load the nearby place.",
  async (request) => {
    const params = new URL(request.url).searchParams;
    const latitude = Number(params.get("lat"));
    const longitude = Number(params.get("lon"));
    const radius = Number(params.get("radius"));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new HttpError(400, "lat and lon are required and must be numbers.");
    }
    // Only the radii the select offers get through: the endpoint answers one it
    // dislikes with an error, which would read here as an outage rather than as
    // the bad request it is.
    if (!isRadiusOption(radius)) {
      throw new HttpError(
        400,
        `radius must be one of ${RADIUS_OPTIONS.join(", ")}.`,
      );
    }

    return { place: await nearbyPlace(latitude, longitude, radius) };
  },
);
