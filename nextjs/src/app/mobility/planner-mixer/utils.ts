/**
 * Client-side helpers and (trimmed-down) types for the Planner Mixer example.
 * The full response shape is defined by the protobuf files in ./proto.
 */

export interface PlanResultJson {
  planner?: string;
  grade?: number;
  timestamp?: string;
  modifiers?: string[];
  trips?: Trip[];
  errors?: { message?: string; code?: string }[];
}

export interface Trip {
  id?: string;
  expectedStartTime?: string;
  expectedEndTime?: string;
  aimedStartTime?: string;
  aimedEndTime?: string;
  /** Minutes. */
  duration?: number;
  transfers?: number;
  legs?: Leg[];
}

export interface Leg {
  id?: string;
  aimedStartTime?: string;
  aimedEndTime?: string;
  expectedStartTime?: string;
  expectedEndTime?: string;
  /** Minutes. */
  duration?: number;
  /** Meters. */
  distance?: number;
  transitLeg?: {
    mode?: string;
    line?: { publicCode?: string; name?: string };
    serviceJourney?: { publicCode?: string };
    fromEstimatedCall?: EstimatedCall;
    toEstimatedCall?: EstimatedCall;
  };
  nonTransitLeg?: { mode?: string; fromPlace?: Place; toPlace?: Place };
  waitingLeg?: { startTime?: string; endTime?: string };
  flexibleLeg?: { mode?: string; fromPlace?: Place; toPlace?: Place };
}

export interface EstimatedCall {
  quay?: { name?: string };
  aimedPlatform?: string;
  expectedPlatform?: string;
  destinationDisplay?: { frontText?: string };
}

export interface Place {
  name?: string;
}

/** "2026-08-04T14:03:00+02:00" → "14:03" */
export function formatTime(iso?: string): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 75 → "1 h 15 min" */
export function formatDuration(minutes?: number): string {
  if (minutes == null) return "–";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}

/** 1878.76 → "1.9 km", 794 → "794 m" */
export function formatDistance(meters?: number): string | null {
  if (meters == null) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/** Start time of a leg, preferring realtime data. */
export function legStartTime(leg: Leg): string | undefined {
  return (
    leg.expectedStartTime ?? leg.aimedStartTime ?? leg.waitingLeg?.startTime
  );
}

/** "Amsterdam Centraal → Schiphol Airport", or null when unknown. */
export function legEndpoints(leg: Leg): string | null {
  const from =
    leg.transitLeg?.fromEstimatedCall?.quay?.name ??
    leg.nonTransitLeg?.fromPlace?.name ??
    leg.flexibleLeg?.fromPlace?.name;
  const to =
    leg.transitLeg?.toEstimatedCall?.quay?.name ??
    leg.nonTransitLeg?.toPlace?.name ??
    leg.flexibleLeg?.toPlace?.name;
  if (!from || !to) return null;
  return `${from} → ${to}`;
}

/**
 * Human-readable planner name. The field is absent when the value is the
 * proto3 default (NEGENTWEE).
 */
export function plannerLabel(planner?: string): string {
  return planner === "OTP" ? "OpenTripPlanner" : "Default planner";
}

/** Short label for a leg, e.g. "IC 2145", "Bus 397" or "Walk". */
export function legLabel(leg: Leg): string {
  if (leg.transitLeg) {
    const { mode, line, serviceJourney } = leg.transitLeg;
    const code = line?.publicCode || serviceJourney?.publicCode;
    return [capitalize(mode), code].filter(Boolean).join(" ") || "Transit";
  }
  if (leg.nonTransitLeg) return capitalize(leg.nonTransitLeg.mode) || "Walk";
  if (leg.waitingLeg) return "Wait";
  if (leg.flexibleLeg) return capitalize(leg.flexibleLeg.mode) || "On demand";
  return "Leg";
}

function capitalize(value?: string): string {
  if (!value) return "";
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
