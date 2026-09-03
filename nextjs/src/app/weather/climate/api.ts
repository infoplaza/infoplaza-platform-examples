import { platformRequest, type Endpoint } from "@/lib/platform";
import type { Climate, Granularity } from "./utils";

/**
 * Server-side client for the Weather Climate API.
 *
 * It is a plain REST endpoint that takes the API key as a query parameter, so
 * it is called from the server only and the browser talks to the route handler
 * in ./normals instead. That keeps the key out of the client bundle.
 *
 * The call goes out through @/lib/platform, which attaches the key and records
 * the request and its answer for the API log at the bottom of the page. This
 * one uses `platformRequest` rather than `platformGet` because it has to tell
 * one kind of failure from the rest; see below.
 */

const WEATHER_CLIMATE: Endpoint = {
  name: "Weather Climate",
  url: "https://api.infoplaza.com/v1/weather/climate",
  docsUrl: "https://platform.infoplaza.com/reference/v1-weather-climate",
};

/**
 * Thrown when the API has no climate year for the point that was asked for.
 * The panel turns this into a hint instead of an error, because it is the one
 * failure a click on the map can cause on its own.
 */
export class NoClimateDataError extends Error {
  constructor() {
    super("The API has no climate data for this location.");
    this.name = "NoClimateDataError";
  }
}

/**
 * The climate year at a point: what an average January, or first half of
 * January, or first ten days of January look like there.
 *
 * Coverage is not the whole globe, and a point outside it comes back as a 500
 * rather than as an empty result, so that case is turned into a
 * NoClimateDataError. Everything else, a missing or wrong key above all, keeps
 * the message the API sent.
 */
export async function climateNormals(
  latitude: number,
  longitude: number,
  granularity: Granularity,
): Promise<Climate> {
  const { status, ok, body } = await platformRequest<Climate>(
    WEATHER_CLIMATE,
    {
      lat: String(latitude),
      lon: String(longitude),
      period: granularity,
    },
  );

  if (!ok || !body?.success) {
    if (status >= 500) throw new NoClimateDataError();
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${status}.`,
    );
  }
  if (!body.data?.periods?.length) throw new NoClimateDataError();

  return body.data;
}
