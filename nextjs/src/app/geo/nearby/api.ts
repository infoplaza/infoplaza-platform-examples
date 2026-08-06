import {
  DEFAULT_LANGUAGE,
  placeKey,
  SEARCH_RADII,
  type NearbyPlace,
  type Place,
} from "./utils";

/**
 * Server-side client for the Geo Nearby API.
 *
 * It is a plain REST endpoint that takes the API key as a query parameter, so
 * it is called from the server only and the browser talks to the route handler
 * in ./places instead. That keeps the key out of the client bundle.
 *
 * API reference: https://platform.infoplaza.com/reference/v1-geo-nearby
 */

const GEO_NEARBY_URL = "https://api.infoplaza.com/v1/geo/nearby";

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

/**
 * The most prominent place within `radius` of the point, or null when the API
 * knows of none there — over open sea, for instance, or when the radius is too
 * tight to reach the nearest one.
 */
async function nearbyPlace(
  latitude: number,
  longitude: number,
  radius: number,
  language: string,
): Promise<Place | null> {
  const url = new URL(GEO_NEARBY_URL);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("language", language);
  url.searchParams.set("api_key", requireApiKey());

  const response = await fetch(url, { cache: "no-store" });
  const body = (await response
    .json()
    .catch(() => null)) as PlatformResponse<Partial<Place>> | null;

  if (!response.ok || !body?.success) {
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${response.status}.`,
    );
  }
  // An answer without a name is the API's way of saying it found nothing.
  if (!body.data?.name) return null;
  return body.data as Place;
}

/**
 * The distinct places around a point, nearest tier first.
 *
 * One call returns one place, so the radii from SEARCH_RADII are asked in
 * parallel and their answers deduplicated: a place that several radii return
 * keeps the smallest of them, which is the tightest circle it was found in.
 *
 * A radius that finds nothing drops out quietly, including when the API fails
 * on it, because it answers an empty search with an error rather than an empty
 * result. Failing radii only surface as an error when not a single one
 * succeeded, so a wrong API key or an outage still comes through.
 */
export async function nearbyPlaces(
  latitude: number,
  longitude: number,
  language: string = DEFAULT_LANGUAGE,
): Promise<NearbyPlace[]> {
  const answers = await Promise.allSettled(
    SEARCH_RADII.map((radius) =>
      nearbyPlace(latitude, longitude, radius, language),
    ),
  );

  const places: NearbyPlace[] = [];
  answers.forEach((answer, index) => {
    if (answer.status !== "fulfilled" || !answer.value) return;
    const place = answer.value;
    if (places.some((found) => placeKey(found) === placeKey(place))) return;
    places.push({ ...place, radius: SEARCH_RADII[index] });
  });

  if (places.length === 0) {
    const failure = answers.find((answer) => answer.status === "rejected");
    if (failure) throw failure.reason;
  }
  return places;
}
