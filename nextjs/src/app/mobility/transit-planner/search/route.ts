import { searchPlaces } from "../api";

/**
 * Search proxy for the From and To fields.
 *
 * The browser calls this route while someone types; it forwards the term to
 * the Transit Planner Search API with the API key from INFOPLAZA_API_KEY and
 * returns the matching locations. Same reason as the WebSocket proxy: the key
 * stays on the server.
 */

/** Below this the search term is too broad to be useful. */
const MIN_QUERY_LENGTH = 2;

export async function GET(request: Request) {
  const query =
    new URL(request.url).searchParams.get("query")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return Response.json({ items: [] });
  }

  try {
    const items = await searchPlaces(query);
    // Results also carry the lines serving each stop; the fields below are
    // all the suggestion list needs, so we leave the rest on the server.
    return Response.json({
      items: items.map(({ name, city, type, stopid, location }) => ({
        name,
        city,
        type,
        stopid,
        location,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search places.";
    return Response.json({ error: message }, { status: 502 });
  }
}
