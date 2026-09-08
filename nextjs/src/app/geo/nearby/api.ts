import { platformRequest, type Endpoint } from "@/lib/platform";
import { DEFAULT_LANGUAGE, type Place } from "./utils";

/**
 * Server-side client for the Geo Nearby API.
 *
 * It is a plain REST endpoint that takes the API key as a query parameter, so
 * it is called from the server only and the browser talks to the route handler
 * in ./place instead. That keeps the key out of the client bundle.
 *
 * The call goes out through @/lib/platform, which attaches the key and records
 * the request and its answer for the API log at the bottom of the page. One
 * lookup is one call, so the log shows one request per click.
 */

const GEO_NEARBY: Endpoint = {
  name: "Geo Nearby",
  url: "https://api.infoplaza.com/v1/geo/nearby",
  docsUrl: "https://platform.infoplaza.com/reference/v1-geo-nearby",
};

/**
 * The most prominent place within `radius` of the point, or null when the API
 * knows of none there: over open sea, for instance, or when the radius is
 * too tight to reach the nearest one.
 *
 * A search that finds nothing is a success with an empty payload, so only a
 * genuine failure throws: a wrong API key, an outage, or a radius the endpoint
 * refuses, which is why the route handler only passes on the ones this example
 * offers.
 */
export async function nearbyPlace(
  latitude: number,
  longitude: number,
  radius: number,
  language: string = DEFAULT_LANGUAGE,
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
