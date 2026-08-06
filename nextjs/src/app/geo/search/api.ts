import { DEFAULT_LANGUAGE, type LanguageCode, type Place } from "./utils";

/**
 * Server-side client for the Geo Search API.
 *
 * It is a plain REST endpoint that takes the API key as a query parameter, so
 * it is called from the server only and the browser talks to the route handler
 * in ./places instead. That keeps the key out of the client bundle.
 *
 * API reference: https://platform.infoplaza.com/reference/v1-geo-search
 */

const GEO_SEARCH_URL = "https://api.infoplaza.com/v1/geo/search";

function requireApiKey(): string {
  const apiKey = process.env.INFOPLAZA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "INFOPLAZA_API_KEY is not set. Copy .env.example to .env.local and add your API key.",
    );
  }
  return apiKey;
}

/** Envelope every Platform REST endpoint wraps its payload in. */
interface PlatformResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

/** Calls a Platform endpoint with the API key attached and unwraps `data`. */
async function platformGet<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", requireApiKey());

  const response = await fetch(url, { cache: "no-store" });
  const body = (await response
    .json()
    .catch(() => null)) as PlatformResponse<T> | null;

  if (!response.ok || !body?.success || !body.data) {
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${response.status}.`,
    );
  }
  return body.data;
}

/**
 * Places matching a search term, each with its coordinates, country and
 * timezone. The language decides which translation of the country and
 * continent names comes back; the place names themselves stay local.
 */
export async function searchPlaces(
  query: string,
  language: LanguageCode = DEFAULT_LANGUAGE,
): Promise<Place[]> {
  return platformGet<Place[]>(GEO_SEARCH_URL, { query, language });
}
