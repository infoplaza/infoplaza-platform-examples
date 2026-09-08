/**
 * Client-side helpers and types for the Geo Nearby example. The shape below
 * covers the fields the API returns for a place.
 */

/** One place returned by the Geo Nearby API. */
export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  /** IANA identifier, e.g. "Europe/Amsterdam". */
  timezone: string;
  country: { code: string; name: string };
  continent: { name: string };
}

/** A point on the map. */
export interface LatLon {
  latitude: number;
  longitude: number;
}

/**
 * The API answers with a single place: the most prominent one within the
 * radius asked for. Widening the radius therefore does not add places, it
 * swaps the answer for a bigger one. Around Houten 2 km returns Houten,
 * 10 km returns Utrecht and 50 km returns Amsterdam.
 *
 * That makes the radius the one thing worth choosing, so these are the radii
 * the select on the page offers, in meters, from a village up to a region.
 * Every lookup is a single call whichever one is picked. Add your own here:
 * the endpoint wants at least 1 km and stops somewhere past 250 km, and
 * answers a radius outside that with an error rather than an empty result.
 */
export const RADIUS_OPTIONS = [1000, 2000, 5000, 10000, 25000, 50000, 100000];

/** The radius the page opens on, which around Houten returns Houten itself. */
export const DEFAULT_RADIUS = 5000;

/** Whether `meters` is one of the radii above. Guards the route handler. */
export function isRadiusOption(meters: number): boolean {
  return RADIUS_OPTIONS.includes(meters);
}

/** The language the API translates country and continent names into. */
export const DEFAULT_LANGUAGE = "en";

/** Houten, the point the API reference uses in its own example. */
export const DEFAULT_LOCATION: LatLon = {
  latitude: 52.02,
  longitude: 5.16,
};

/** "52.09083, 5.12222" */
export function formatCoordinates(point: LatLon): string {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
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

/** Mean radius of the earth, the sphere the geometry here assumes. */
export const EARTH_RADIUS_METERS = 6_371_000;

/** Great-circle distance in meters between two points. */
export function distanceMeters(from: LatLon, to: LatLon): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(a));
}

/** 1878.76 → "1.9 km", 794 → "794 m" */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/** 16000 → "16 km", 800 → "800 m" */
export function formatRadius(meters: number): string {
  if (meters >= 1000) return `${meters / 1000} km`;
  return `${meters} m`;
}
