import { apiRoute } from "@/lib/platform";
import { searchPlaces } from "../api";

/**
 * Search proxy for the From and To fields.
 *
 * The browser calls this route while someone types; it forwards the term to
 * the Transit Planner Search API with the API key from INFOPLAZA_API_KEY and
 * returns the matching locations. Same reason as the WebSocket proxy: the key
 * stays on the server.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */

/** Below this the search term is too broad to be useful. */
const MIN_QUERY_LENGTH = 2;

export const GET = apiRoute("Failed to search places.", async (request) => {
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";

  // A term this short is not asked about at all, so this answer costs no call.
  if (query.length < MIN_QUERY_LENGTH) return { items: [] };

  const items = await searchPlaces(query);

  // Results also carry the lines serving each stop; the fields below are
  // all the suggestion list needs, so we leave the rest on the server.
  return {
    items: items.map(({ name, city, type, stopid, location }) => ({
      name,
      city,
      type,
      stopid,
      location,
    })),
  };
});
