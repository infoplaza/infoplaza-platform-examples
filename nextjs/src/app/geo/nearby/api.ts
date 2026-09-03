import { platformRequest, type Endpoint } from "@/lib/platform";
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
 * The calls go out through @/lib/platform, which attaches the key and records
 * each request and its answer for the API log at the bottom of the page. One
 * lookup is several calls here, and the log shows all of them.
 */

const GEO_NEARBY: Endpoint = {
  name: "Geo Nearby",
  url: "https://api.infoplaza.com/v1/geo/nearby",
  docsUrl: "https://platform.infoplaza.com/reference/v1-geo-nearby",
};

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
  const { status, ok, body } = await platformRequest<Partial<Place>>(
    GEO_NEARBY,
    {
      lat: String(latitude),
      lon: String(longitude),
      radius: String(radius),
      language,
    },
  );

  if (!ok || !body?.success) {
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${status}.`,
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
