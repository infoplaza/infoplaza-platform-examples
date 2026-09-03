import { apiRoute } from "@/lib/platform";
import { searchPlaces } from "../api";
import { DEFAULT_LANGUAGE, isLanguageCode, MIN_QUERY_LENGTH } from "../utils";

/**
 * Search proxy for the textbox.
 *
 * The browser calls this route while someone types; it forwards the term to
 * the Geo Search API with the API key from INFOPLAZA_API_KEY and returns the
 * matching places. The key stays server-side.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to search places.", async (request) => {
  const params = new URL(request.url).searchParams;
  const query = params.get("query")?.trim() ?? "";
  const requested = params.get("language") ?? DEFAULT_LANGUAGE;

  // A term this short is not asked about at all, so this answer costs no call.
  if (query.length < MIN_QUERY_LENGTH) return { places: [] };

  const language = isLanguageCode(requested) ? requested : DEFAULT_LANGUAGE;

  return { places: await searchPlaces(query, language) };
});
