/**
 * Client-side helpers and types for the Geo Search example. The shape below
 * covers the fields the API returns for a match.
 */

/** One place returned by the Geo Search API. */
export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  /** IANA identifier, e.g. "Europe/Amsterdam". */
  timezone: string;
  country: { code: string; name: string };
  continent: { name: string };
}

/** The languages the API translates country and continent names into. */
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "hr", label: "Hrvatski" },
  { code: "cs", label: "Čeština" },
  { code: "el", label: "Ελληνικά" },
  { code: "hu", label: "Magyar" },
  { code: "pl", label: "Polski" },
  { code: "sv", label: "Svenska" },
  { code: "tr", label: "Türkçe" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

/** The term the page opens on, so it arrives with results to show. */
export const DEFAULT_QUERY = "Utrecht";

/** Below this a term is too broad to be worth a request. */
export const MIN_QUERY_LENGTH = 2;

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

/**
 * Matches carry no identifier, and a name can repeat across countries, so the
 * coordinates are what make a result unique.
 */
export function placeKey(place: Place): string {
  return `${place.name}|${place.latitude}|${place.longitude}`;
}

/** "Nederland · Europa" */
export function placeRegion(place: Place): string {
  return [place.country.name, place.continent.name].filter(Boolean).join(" · ");
}

/** "52.09083, 5.12222" */
export function formatCoordinates(place: Place): string {
  return `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`;
}

/**
 * "NL" → "🇳🇱". Flags are pairs of regional indicator symbols, which sit at a
 * fixed offset from the Latin letters of the country code.
 */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  const REGIONAL_INDICATOR_A = 0x1f1e6;
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(
      (letter) => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - 65,
    ),
  );
}

/**
 * The wall-clock time at a place right now, or null when its timezone is one
 * this browser does not know.
 */
export function localTime(timezone: string, at: Date): string | null {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(at);
  } catch {
    return null;
  }
}
