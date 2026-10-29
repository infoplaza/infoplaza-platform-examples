import { platformGet, type Endpoint } from "@/lib/platform";
import { platformUrl } from "@/lib/platform-url";
import {
  DEFAULT_LANGUAGE,
  dedupeWarnings,
  sortWarnings,
  type LanguageCode,
  type Warning,
  type WarningAreaFeature,
} from "./utils";

/**
 * Server-side client for the Weather Warnings and Weather Warnings Geo APIs.
 *
 * Both are plain REST endpoints that take the API key as a query parameter,
 * so they are called from the server only and the browser talks to the route
 * handlers in ./lookup and ./areas instead. That keeps the key out of the
 * client bundle.
 *
 * The call goes out through @/lib/platform, which attaches the key and records
 * the request and its answer for the API log at the bottom of the page.
 */

const WEATHER_WARNINGS: Endpoint = {
  name: "Weather Warnings",
  url: platformUrl("v1/weather/warnings"),
  docsUrl: "https://platform.infoplaza.com/reference/v1-weather-warnings",
};

/** What the endpoint answers with: the point asked for, and its warnings. */
interface WarningsData {
  latitude: number;
  longitude: number;
  language: string;
  /** Warnings before duplicates are collapsed, so it can exceed the list. */
  count: number;
  warnings: Warning[];
}

/**
 * The warnings in force for a point, severest first.
 *
 * A location can be covered by several services at once, and each of them
 * reissues a warning as its forecast firms up, so the same warning arrives
 * more than once: unchanged apart from a newer `created`, or simply repeated.
 * Showing those as separate rows would read as a dozen heat warnings where
 * there is one, so identical warnings are collapsed here and the most recent
 * issue is kept.
 *
 * Warnings that have not started yet come along with the active ones, marked
 * by `active: false`. They are kept, and the list marks them as upcoming.
 */
export async function weatherWarnings(
  latitude: number,
  longitude: number,
  language: LanguageCode = DEFAULT_LANGUAGE,
): Promise<Warning[]> {
  const data = await platformGet<WarningsData>(WEATHER_WARNINGS, {
    lat: String(latitude),
    lon: String(longitude),
    language,
  });

  return sortWarnings(dedupeWarnings(data.warnings ?? []));
}

const WEATHER_WARNINGS_GEO: Endpoint = {
  name: "Weather Warnings Geo",
  url: platformUrl("v1/weather/warnings/geo"),
  docsUrl: "https://platform.infoplaza.com/reference/v1-weather-warnings-geo",
};

/** The texts of one warning in one language. */
interface GeoWarningText {
  Headline?: string;
  Body?: string;
}

/** One feature as the Geo endpoint sends it. */
interface GeoWarningFeature {
  type: "Feature";
  id: number;
  geometry: WarningAreaFeature["geometry"];
  properties: {
    id: number;
    name: string;
    level: number;
    /** Keyed by language code; only the language asked for is filled in. */
    texts: Record<string, GeoWarningText>;
    country: string;
    /** Unix seconds, where the point endpoint sends ISO strings. */
    activeStart: number;
    activeEnd: number;
    created: number;
    updated: number;
  };
}

interface GeoWarningsData {
  type: "FeatureCollection";
  features: GeoWarningFeature[];
}

/**
 * Every warning in force or coming up in Europe, with the region it covers.
 *
 * One call answers for the whole continent — some two hundred areas and well
 * over half a megabyte — and costs 100 credits, so it is made once when the
 * page opens and again only when the language changes.
 *
 * The features are flattened into the same vocabulary the point endpoint
 * uses: ISO times instead of unix seconds, `countryCode` instead of
 * `country`, and the headline and text of the language asked for, so the
 * map and the list beside it can share their formatting.
 */
export async function weatherWarningAreas(
  language: LanguageCode = DEFAULT_LANGUAGE,
): Promise<WarningAreaFeature[]> {
  const data = await platformGet<GeoWarningsData>(WEATHER_WARNINGS_GEO, {
    language,
  });
  const now = Date.now() / 1000;
  const iso = (seconds: number) => new Date(seconds * 1000).toISOString();

  return (data.features ?? []).map((feature) => {
    const { properties } = feature;
    const texts = properties.texts[language] ?? {};

    return {
      type: "Feature",
      id: feature.id,
      geometry: feature.geometry,
      properties: {
        id: properties.id,
        name: properties.name,
        title: texts.Headline?.trim() || properties.name,
        text: texts.Body ?? "",
        level: properties.level,
        countryCode: properties.country,
        active: properties.activeStart <= now,
        activeStart: iso(properties.activeStart),
        activeEnd: iso(properties.activeEnd),
        created: iso(properties.created),
      },
    };
  });
}
