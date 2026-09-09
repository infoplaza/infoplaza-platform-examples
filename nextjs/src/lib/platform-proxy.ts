import type { ApiCall } from "./api-call";

/**
 * The Platform behind the component library.
 *
 * The examples built on @infoplaza/platform do not call the Platform the way
 * the other examples do. Their components fetch for themselves, from the
 * browser, and they all fetch from one mounted handler: the package ships a
 * catch-all route, `PlatformAuth`, which is mounted once at
 * /api/platform/[...platform] and answers every endpoint the components know
 * how to ask for. The API key is attached there, so it stays server-side just
 * as it does everywhere else.
 *
 * That leaves the API log with nothing to show, because the calls it lists are
 * the ones this app makes to the Platform, and these are made inside a package
 * it does not control. This module is what puts them back: it names the
 * Platform endpoint behind each proxied request, and it keeps the recordings
 * until the page collects them from /api/platform-log.
 *
 * API reference: https://platform.infoplaza.com/reference
 */

/** Where `PlatformAuth` is mounted, which is where the components look. */
export const PLATFORM_BASE_PATH = "/api/platform";

/**
 * The Weather Maps API the map components are pointed at.
 *
 * `PlatformAuth` derives the timeseries and ensemble bases from this one by
 * swapping the `/weather/maps` segment, so all three follow it rather than
 * being configured separately.
 */
export const WEATHER_MAPS_BASE_URL =
  "https://api.infoplaza.com/v1/weather/maps";

/** A Platform endpoint in words, without the URL it is called at. */
interface ProxiedEndpoint {
  /** The endpoint in words, e.g. "Weather Timeseries Point". */
  name: string;
  /** The endpoint in the Platform reference. */
  docsUrl: string;
}

/**
 * What the components can ask for, keyed by the first path segment after
 * /api/platform. It mirrors the endpoints registered in the package, plus the
 * layers endpoint the route serves itself: a request for anything else is
 * answered with a 404 by the handler and never reaches the Platform, so it is
 * not listed here either.
 *
 * Only the wording lives here. Which URL a request goes out as is not
 * reconstructed from the query but taken from the call itself, so the log
 * cannot drift from what the package does.
 */
const PROXIED_ENDPOINTS: Record<string, ProxiedEndpoint> = {
  models: {
    name: "Weather Maps Models",
    docsUrl:
      "https://platform.infoplaza.com/reference/v1-weather-maps-models",
  },
  // The one endpoint here the package does not ask for by itself: it fetches
  // its layers straight from the maps host the Platform fronts. The Maps
  // example points those requests at this segment instead, which is what puts
  // the documented endpoint behind the layers on the map and its calls in the
  // log. See src/app/weather/maps/layers.ts.
  layers: {
    name: "Weather Maps Layers",
    docsUrl:
      "https://platform.infoplaza.com/reference/v1-weather-maps-layers",
  },
  "timeseries-models": {
    name: "Weather Timeseries Models",
    docsUrl:
      "https://platform.infoplaza.com/reference/v1-weather-timeseries-models",
  },
  "timeseries-point-forecast": {
    name: "Weather Timeseries Point",
    docsUrl:
      "https://platform.infoplaza.com/reference/v1-weather-timeseries-point",
  },
  "ensemble-models": {
    name: "Weather Ensemble Models",
    docsUrl:
      "https://platform.infoplaza.com/reference/v1-weather-ensemble-models",
  },
  "ensemble-point-forecast": {
    name: "Weather Ensemble Point",
    docsUrl:
      "https://platform.infoplaza.com/reference/v1-weather-ensemble-point",
  },
};

/**
 * The Platform endpoint one proxied request stands for, or null when the
 * segment is not one the package proxies.
 */
export function proxiedEndpoint(segment: string): ProxiedEndpoint | null {
  return PROXIED_ENDPOINTS[segment] ?? null;
}

/**
 * The calls waiting to be collected.
 *
 * A recording is kept until the page asks for it and then dropped, so nothing
 * is shown twice. The cap is what stops a page nobody is watching from
 * growing the list forever; it is one list for the whole server, which is
 * fine for an example that runs locally and would not be for a shared one.
 */
const MAX_PENDING_CALLS = 50;

let pending: ApiCall[] = [];

/** Files a proxied call for the next collection. */
export function recordProxiedCall(call: ApiCall): void {
  pending = [...pending, call].slice(-MAX_PENDING_CALLS);
}

/** Everything recorded since the last collection, oldest first. */
export function takeProxiedCalls(): ApiCall[] {
  const collected = pending;
  pending = [];
  return collected;
}
