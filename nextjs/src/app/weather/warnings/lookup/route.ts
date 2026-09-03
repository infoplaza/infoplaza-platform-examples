import { apiRoute, HttpError } from "@/lib/platform";
import { weatherWarnings } from "../api";
import { DEFAULT_LANGUAGE, isLanguageCode } from "../utils";

/**
 * Warnings proxy for the map.
 *
 * The browser calls this route with the coordinates that were picked on the
 * map; it forwards them to the Weather Warnings API with the API key from
 * INFOPLAZA_API_KEY and returns the warnings it finds. The key stays
 * server-side.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load warnings.", async (request) => {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const requested = params.get("language") ?? DEFAULT_LANGUAGE;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HttpError(400, "lat and lon are required and must be numbers.");
  }

  const language = isLanguageCode(requested) ? requested : DEFAULT_LANGUAGE;

  return { warnings: await weatherWarnings(latitude, longitude, language) };
});
