"use client";

/**
 * Points the map components at the Weather Maps Layers API.
 *
 * The components ask two endpoints for what they draw. The catalog of models
 * they offer is fetched through /api/platform, which is where the package's
 * own route handler is mounted, and lands in the API log by itself:
 *
 *   https://platform.infoplaza.com/reference/v1-weather-maps-models
 *
 * The layers themselves are the second call, one per element in frame. The
 * package fetches those from its own tile host, straight from the browser and
 * in a response shape of its own. That call carries no key and never passes
 * this app at all, so it cannot be logged either. This module is what puts it
 * on the documented endpoint instead:
 *
 *   https://platform.infoplaza.com/reference/v1-weather-maps-layers
 *
 * It wraps `fetch` for as long as the map is open. A request for layers is
 * rewritten to /api/platform/layers, where the route attaches the key, and the
 * answer is turned back into the shape the components read. Everything else
 * the page fetches is passed through untouched.
 *
 * The images themselves are not rewritten. The layers answer names them by
 * URL, on the tile host, and that is where the browser loads them from: the
 * Platform hands out those same URLs.
 */

/** Where the components ask for their layers when nothing intervenes. */
const PACKAGE_LAYERS_URL = "https://api.imweather.com/v0/gridmapdata/layers/";

/** The tile host, which is what the components prefix a layer URL with. */
const MAPS_HOST_URL = new URL(PACKAGE_LAYERS_URL).origin;

/** Where this route is served: the layers segment of the mounted handler. */
const PLATFORM_LAYERS_PATH = "/api/platform/layers";

/**
 * The endpoint's parameters, in the order the package puts them in the path.
 *
 * The four corners are the frame the layers are asked for: the package writes
 * them as `{ne.lat}/{sw.lng}/{sw.lat}/{ne.lng}`, the endpoint takes them by
 * name.
 */
const PATH_PARAMS = [
  "model",
  "run",
  "element",
  "zoom",
  "north",
  "west",
  "south",
  "east",
] as const;

/** What the element is read at, sent along when the layer asks for it. */
const QUERY_PARAMS = ["level", "unit", "grayscale", "member"] as const;

/** A layer as it arrives from the Platform. */
interface PlatformLayer {
  timestamp: number;
  datetime: string;
  /** The image for this moment, on the maps host. */
  imageUrl: string;
}

/** The answer the Weather Maps Layers endpoint gives. */
interface PlatformLayers {
  data?: {
    element?: {
      name?: string;
      category?: string;
      unit?: string;
      units?: string[];
      level?: string;
      isLogscale?: boolean;
      isComposite?: boolean;
    };
    layers?: PlatformLayer[];
    /** The colours the values are drawn in, and the image of that scale. */
    palette?: {
      imageUrl?: string;
      colors?: string[];
      values?: (number | null)[];
      labels?: number[];
    };
    boundingbox?: Record<string, number>;
  };
}

/**
 * The Platform request one layers request stands for, or null when it is not
 * one of them.
 *
 * Contours are the same call with a different `outputtype`, answered with
 * lines rather than images, which is not what this endpoint returns. Those are
 * left on the route the package picked.
 */
function platformRequest(requested: string): { url: string; model: string } | null {
  if (!requested.startsWith(PACKAGE_LAYERS_URL)) return null;

  const asked = new URL(requested);
  if (asked.searchParams.get("outputtype") !== "image") return null;

  const path = requested
    .slice(PACKAGE_LAYERS_URL.length)
    .split("?")[0]
    .split("/");
  if (path.length !== PATH_PARAMS.length) return null;

  const url = new URL(PLATFORM_LAYERS_PATH, window.location.origin);
  PATH_PARAMS.forEach((name, index) => {
    url.searchParams.set(name, decodeURIComponent(path[index]));
  });
  for (const name of QUERY_PARAMS) {
    const value = asked.searchParams.get(name);
    if (value) url.searchParams.set(name, value);
  }

  return { url: url.toString(), model: url.searchParams.get("model") ?? "" };
}

/** A URL on the tile host as a path, which is how the components carry one:
 * they prefix it with the host themselves. */
function mapsHostPath(url: string, format?: string): string {
  const address = new URL(url, MAPS_HOST_URL);
  if (format) address.searchParams.set("format", format);
  return `${address.pathname}${address.search}`;
}

/**
 * The Platform's answer, as the components read one.
 *
 * Everything is a rename: the palette the endpoint returns as one object is
 * what the components look for on the element, and the image URLs are paths
 * because that is what they prefix the maps host onto. `region_category` is
 * the exception. It is not in this answer at all, and it is what decides how a
 * regional model's images are scaled, so it is read from the models catalog
 * the page already has.
 */
function packageLayers(
  answer: PlatformLayers,
  regionCategory: string | undefined,
): unknown {
  const { element, layers, palette, boundingbox } = answer.data ?? {};

  return {
    layers: (layers ?? []).map(({ timestamp, datetime, imageUrl }) => {
      const image = new URL(imageUrl, MAPS_HOST_URL);
      const webp = `${image.pathname}${image.search}`;
      // The components ask an image for the format they want, the way they do
      // with the answer this one stands in for, so the format the Platform
      // filled in is dropped rather than asked for twice.
      image.searchParams.delete("format");

      return {
        timestamp,
        datetime,
        url: `${image.pathname}${image.search}`,
        url_webp: webp,
      };
    }),
    element: {
      name: element?.name,
      category: element?.category,
      unit: element?.unit,
      units: element?.units,
      level: element?.level,
      isLogscale: element?.isLogscale ?? false,
      composite: element?.isComposite ?? false,
      // The Platform hands out one image of the scale, in webp, where the
      // shape the components read has one URL per format and loads the png.
      // Which format it is is a parameter on that same URL, and it has to be
      // the png: the components read the format out of the URL to know what
      // they are loading, and a scale they cannot place is a layer drawn in
      // one flat colour.
      palette: palette?.imageUrl
        ? {
            png: mapsHostPath(palette.imageUrl, "png"),
            webp: mapsHostPath(palette.imageUrl, "webp"),
          }
        : undefined,
      visualization: palette?.colors,
      databounds: palette?.values,
      datalabels: palette?.labels,
    },
    ...(regionCategory
      ? { rundescription: { region_category: regionCategory } }
      : {}),
    boundingbox,
  };
}

/**
 * Sends the layer requests to the Platform for as long as the map is open.
 *
 * `regionCategoryOf` looks a model up in the catalog the page loaded, which is
 * why this is installed from inside the providers rather than at import.
 * Returns the undo, so the wrapper lives exactly as long as the component that
 * installed it.
 */
export function installLayersProxy(
  regionCategoryOf: (model: string) => string | undefined,
): () => void {
  const previous = window.fetch;

  const proxied: typeof fetch = async (input, init) => {
    const requested =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const platform = platformRequest(requested);
    if (!platform) return previous(input, init);

    // The signal in `init` is the one the map aborts with when the frame moves
    // on, so it is passed along rather than dropped.
    const response = await previous(platform.url, init);
    if (!response.ok) return response;

    return Response.json(
      packageLayers(
        (await response.json()) as PlatformLayers,
        regionCategoryOf(platform.model),
      ),
    );
  };

  window.fetch = proxied;

  return () => {
    // Only if nothing else wrapped `fetch` in the meantime, so this cannot
    // undo a wrapper it did not install.
    if (window.fetch === proxied) window.fetch = previous;
  };
}
