import { apiRoute, HttpError } from "@/lib/platform";
import { climateNormals, NoClimateDataError } from "../api";
import { GRANULARITIES, type Granularity } from "../utils";

/**
 * Climate proxy for the map.
 *
 * The browser calls this route with the coordinates that were picked on the
 * map and the granularity that is selected; it forwards them to the Weather
 * Climate API with the API key from INFOPLAZA_API_KEY and returns the climate
 * year it gets back. The key stays server-side.
 *
 * A point the API has no data for answers 404 with `covered: false`, which the
 * panel shows as a hint rather than as an error.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns an HttpError into its own
 * status and anything else into a 502.
 */
export const GET = apiRoute("Failed to load climate data.", async (request) => {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const granularity = params.get("period") ?? "month";

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HttpError(400, "lat and lon are required and must be numbers.");
  }
  if (!GRANULARITIES.some(({ value }) => value === granularity)) {
    throw new HttpError(
      400,
      `period must be one of ${GRANULARITIES.map(({ value }) => value).join(", ")}.`,
    );
  }

  try {
    return {
      climate: await climateNormals(
        latitude,
        longitude,
        granularity as Granularity,
      ),
    };
  } catch (error) {
    if (error instanceof NoClimateDataError) {
      throw new HttpError(404, error.message, { covered: false });
    }
    throw error;
  }
});
