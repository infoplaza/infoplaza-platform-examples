import { searchPlaces } from "../api";
import { DEFAULT_LANGUAGE, isLanguageCode, MIN_QUERY_LENGTH } from "../utils";

/**
 * Search proxy for the textbox.
 *
 * The browser calls this route while someone types; it forwards the term to
 * the Geo Search API with the API key from INFOPLAZA_API_KEY and returns the
 * matching places. The key stays server-side.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("query")?.trim() ?? "";
  const requested = params.get("language") ?? DEFAULT_LANGUAGE;

  if (query.length < MIN_QUERY_LENGTH) {
    return Response.json({ places: [] });
  }

  const language = isLanguageCode(requested) ? requested : DEFAULT_LANGUAGE;

  try {
    return Response.json({ places: await searchPlaces(query, language) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search places.";
    return Response.json({ error: message }, { status: 502 });
  }
}
