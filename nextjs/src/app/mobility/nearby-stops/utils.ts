/**
 * Client-side helpers and types for the Nearby Stops example. The shapes
 * below cover the fields this example uses; the APIs return a little more.
 */

/** A stop place: one or more quays grouped under a single name. */
export interface StopPlace {
  id: string;
  name: string;
  town?: string;
  latitude: number;
  longitude: number;
}

/** One departure from a stop place in the next hour. */
export interface Departure {
  destination?: string;
  operationDate?: string;
  serviceJourneyId?: string;
  aimedDepartureTime?: string;
  expectedDepartureTime?: string;
  cancelled?: boolean;
  realtime?: boolean;
  line?: {
    publicCode?: string;
    /** Hex RGB without the "#", or null when the operator supplies none. */
    color?: string | null;
    textColor?: string | null;
    /** e.g. "bus", "tram", "metro", "train", "ferry". */
    mode?: string;
  };
  quay?: { id?: string; publicCode?: string | null };
  operator?: { id?: string };
}

/** A point on the map. */
export interface LatLon {
  latitude: number;
  longitude: number;
}

/** Amsterdam Centraal — where the map opens so the page has data on load. */
export const DEFAULT_LOCATION: LatLon = {
  latitude: 52.3791,
  longitude: 4.9003,
};

/** "2026-08-06T12:03:00+02:00" → "12:03" */
export function formatTime(iso?: string): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Minutes a departure runs late, or null when it is on time or the API has no
 * realtime estimate for it yet.
 */
export function delayMinutes(departure: Departure): number | null {
  const { aimedDepartureTime, expectedDepartureTime } = departure;
  if (!aimedDepartureTime || !expectedDepartureTime) return null;
  const diff =
    new Date(expectedDepartureTime).getTime() -
    new Date(aimedDepartureTime).getTime();
  const minutes = Math.round(diff / 60_000);
  return minutes > 0 ? minutes : null;
}

/**
 * Inline styles for a line badge. Operators may leave the colours out, so
 * fall back to the same neutral grey the rest of the page uses.
 */
export function lineBadgeStyle(line?: Departure["line"]): {
  backgroundColor: string;
  color: string;
} {
  return {
    backgroundColor: line?.color ? `#${line.color}` : "#e5e7eb",
    color: line?.textColor ? `#${line.textColor}` : "#111827",
  };
}

/** "bus" → "Bus" */
export function modeLabel(mode?: string): string {
  if (!mode) return "";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

/** "Centraal Station · Amsterdam", or just the name when the town repeats it. */
export function stopLabel(stop: StopPlace): string {
  if (!stop.town || stop.name.includes(stop.town)) return stop.name;
  return `${stop.name} · ${stop.town}`;
}

const EARTH_RADIUS_METERS = 6_371_000;

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

/**
 * The nearby API returns stops in no particular order, so sort them by how
 * far they are from the point that was picked.
 */
export function sortByDistance(
  stops: StopPlace[],
  origin: LatLon,
): StopPlace[] {
  return [...stops].sort(
    (a, b) => distanceMeters(origin, a) - distanceMeters(origin, b),
  );
}
