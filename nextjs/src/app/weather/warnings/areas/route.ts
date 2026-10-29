import { apiRoute } from "@/lib/platform";
import { weatherWarningAreas } from "../api";
import { DEFAULT_LANGUAGE, isLanguageCode } from "../utils";

/**
 * Warning areas proxy for the map.
 *
 * The browser calls this route once the page is on screen, and again when
 * the language changes; it asks the Weather Warnings Geo API for every
 * warning in Europe with the API key from INFOPLAZA_API_KEY and returns them
 * as features the map can draw. The key stays server-side.
 *
 * The areas are not part of the server render: the answer runs to well over
 * half a megabyte, which would otherwise travel with the page itself.
 */
export const GET = apiRoute("Failed to load warning areas.", async (request) => {
  const requested =
    new URL(request.url).searchParams.get("language") ?? DEFAULT_LANGUAGE;
  const language = isLanguageCode(requested) ? requested : DEFAULT_LANGUAGE;

  return { areas: await weatherWarningAreas(language) };
});
