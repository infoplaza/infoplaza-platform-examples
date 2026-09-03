import { platformGet, type Endpoint } from "@/lib/platform";
import { DEFAULT_LANGUAGE, type LanguageCode, type Place } from "./utils";

/**
 * Server-side client for the Geo Search API.
 *
 * It is a plain REST endpoint that takes the API key as a query parameter, so
 * it is called from the server only and the browser talks to the route handler
 * in ./places instead. That keeps the key out of the client bundle.
 *
 * The call goes out through @/lib/platform, which attaches the key and records
 * the request and its answer for the API log at the bottom of the page.
 */

const GEO_SEARCH: Endpoint = {
  name: "Geo Search",
  url: "https://api.infoplaza.com/v1/geo/search",
  docsUrl: "https://platform.infoplaza.com/reference/v1-geo-search",
};

/**
 * Places matching a search term, each with its coordinates, country and
 * timezone. The language decides which translation of the country and
 * continent names comes back; the place names themselves stay local.
 */
export async function searchPlaces(
  query: string,
  language: LanguageCode = DEFAULT_LANGUAGE,
): Promise<Place[]> {
  return platformGet<Place[]>(GEO_SEARCH, { query, language });
}
