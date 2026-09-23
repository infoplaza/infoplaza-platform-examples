/**
 * Types and helpers for the Traffic example.
 *
 * The example combines two views of the same set of live traffic events:
 * the Traffic Geo API returns them as GeoJSON so they can be drawn on a map,
 * and the Traffic Overview API returns them as plain records with the delay
 * and queue length attached. Neither response carries the other's fields, so
 * they are joined here into one list that feeds both the map and the list.
 */

/** GeoJSON geometry as the Traffic Geo API returns it. */
export type Geometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] };

/** One feature from the Traffic Geo API. */
export interface GeoFeature {
  id: string;
  type: "Feature";
  geometry: Geometry;
  properties: {
    id: string;
    /** "Verkeershinder", "Verkeers maatregel" or "Omleiding". */
    type: string;
    cause: string;
    /** "congestion", "carriagewayClosed", "laneClosed" or "diversion". */
    causeType: string;
    description: string;
    roadName: string;
    roadNumber: string;
    startTime: string;
    versionTime: string;
    fromLocation?: string;
    toLocation?: string;
    /** Queue length in meters, as a string. Only on congestion events. */
    queueLength?: string;
    trend?: string;
    delayBand?: string;
    /** "stationary", "slow", "closed", "diversion" or empty. */
    presentationType?: string;
  };
}

/** One event from the Traffic Overview API. */
export interface OverviewEvent {
  type: string;
  cause: string;
  causeType: string;
  description: string;
  roadName: string;
  roadNumber: string;
  startTime: string;
  startLocation?: string;
  endLocation?: string;
  /** Queue length in kilometers. */
  queueLength: number;
  delayMinutes: number;
  trend?: string;
}

/** Counts across all current events, straight from the Overview API. */
export interface TrafficSummary {
  /** Number of events that are traffic jams. */
  jams: number;
  /** Number of events in total. */
  events: number;
  /** Total length of all jams in kilometers. */
  length: number;
  updated: string;
}

/** One event with the fields of both APIs merged. */
export interface TrafficEvent {
  id: string;
  type: string;
  cause: string;
  causeType: string;
  description: string;
  roadName: string;
  roadNumber: string;
  startTime: string;
  fromLocation?: string;
  toLocation?: string;
  trend?: string;
  /** Delay in minutes, from the Overview API. 0 when there is none. */
  delayMinutes: number;
  /** Queue length in kilometers, from the Overview API. 0 when there is none. */
  queueKm: number;
  /** Null when the Geo API has no feature for this event. */
  geometry: Geometry | null;
}

/**
 * The APIs share no event identifier, but road number, description and start
 * time together are unique within each response, so they make a usable key.
 */
function joinKey(event: {
  roadNumber: string;
  description: string;
  startTime: string;
}): string {
  return `${event.roadNumber}|${event.description}|${event.startTime}`;
}

/**
 * Merges both responses into one list, ordered by delay so the worst holdups
 * come first. Events are matched on their shared fields; anything the Geo API
 * did not return keeps a null geometry and is listed without a map shape.
 */
export function mergeEvents(
  features: GeoFeature[],
  events: OverviewEvent[],
): TrafficEvent[] {
  const geoByKey = new Map(features.map((f) => [joinKey(f.properties), f]));

  const merged = events.map((event, index) => {
    const feature = geoByKey.get(joinKey(event));
    return {
      // The Geo API's id is the upstream event id; fall back to the position
      // in the overview when there is no matching feature.
      id: feature?.properties.id ?? `event-${index}`,
      type: event.type,
      cause: event.cause,
      causeType: event.causeType,
      description: event.description,
      roadName: event.roadName,
      roadNumber: event.roadNumber,
      startTime: event.startTime,
      fromLocation: event.startLocation,
      toLocation: event.endLocation,
      trend: event.trend,
      delayMinutes: event.delayMinutes ?? 0,
      queueKm: event.queueLength ?? 0,
      geometry: feature?.geometry ?? null,
    };
  });

  return merged.sort(
    (a, b) => b.delayMinutes - a.delayMinutes || b.queueKm - a.queueKm,
  );
}

/** Colour per cause type, shared by the map shapes and the list. */
export const CAUSE_COLORS: Record<string, string> = {
  congestion: "#dc2626",
  carriagewayClosed: "#2e2e2b",
  laneClosed: "#f59e0b",
  diversion: "#0070de",
};

const FALLBACK_COLOR = "#6b7280";

export function causeColor(causeType: string): string {
  return CAUSE_COLORS[causeType] ?? FALLBACK_COLOR;
}

/** "carriagewayClosed" → "Carriageway closed" */
export function causeLabel(causeType: string): string {
  const words = causeType.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The stretch of road an event covers, e.g. "Knooppunt Ewijk → Afrit Nijmegen". */
export function locationLabel(event: TrafficEvent): string {
  if (event.fromLocation && event.toLocation) {
    return `${event.fromLocation} → ${event.toLocation}`;
  }
  return event.roadName;
}

/** "2026-08-06T10:08:28Z" → "12:08" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
