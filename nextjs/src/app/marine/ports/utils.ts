/**
 * Client-side helpers and types for the Ports example. The shapes below cover
 * the fields the Port List and Port Info APIs return.
 *
 * Both endpoints answer from the NGA World Port Index, so the vocabulary is
 * that publication's: harbours are graded by shelter and size, and everything
 * a port can offer is recorded as "Yes", "No" or "Unknown" rather than as a
 * boolean. The helpers here turn that vocabulary into something readable
 * without pretending an unsurveyed port has said no.
 */

/** How the World Port Index grades a harbour by the traffic it can take. */
export type PortSize = "very_small" | "small" | "medium" | "large";

/** One port as the Port List API returns it: enough to put it on a map. */
export interface Port {
  id: number;
  name: string;
  country: string;
  size: PortSize;
  latitude: number;
  longitude: number;
}

/** Charted depths, in metres. Null wherever the survey has no figure. */
export interface Depths {
  channel: number | null;
  anchorage: number | null;
  cargo_pier: number | null;
  oil_terminal: number | null;
  lng_terminal: number | null;
  entrance_width: number | null;
  tidal_range: number | null;
}

/** The largest vessel the port has handled, in metres. */
export interface VesselLimits {
  length: number | null;
  beam: number | null;
  draft: number | null;
}

/**
 * A group of capabilities, each answered with "Yes", "No" or "Unknown". The
 * keys differ per group, so they stay open-ended and are rendered from
 * whatever comes back.
 */
export type CapabilityGroup = Record<string, string>;

/** Everything the Port Info API knows about one port. */
export interface PortInfo extends Port {
  alternate_name: string | null;
  /** UN/LOCODE, e.g. "NL RTM". Null for ports without one. */
  unlocode: string | null;
  region: string;
  waterbody: string;
  harbor_type: string;
  harbor_use: string;
  shelter: string;
  /** NGA navigational area, as a roman numeral. */
  nav_area: string;
  /** The sailing directions covering this port, and where to read them. */
  publication: string;
  publication_url: string;
  chart: string;
  depths: Depths;
  max_vessel: VesselLimits;
  offshore_max_vessel: VesselLimits;
  /** Repair capability, graded rather than answered yes or no. */
  repair: CapabilityGroup;
  entrance_restrictions: CapabilityGroup;
  pilotage: CapabilityGroup;
  tugs: CapabilityGroup;
  quarantine: CapabilityGroup;
  communications: CapabilityGroup;
  facilities: CapabilityGroup;
  cranes: CapabilityGroup;
  services: CapabilityGroup;
  supplies: CapabilityGroup;
  features: CapabilityGroup;
}

/**
 * The four size grades, largest first, with how many ports each holds. The
 * counts are the ones the API returns today and are shown next to the filter
 * so the jump from 170 large ports to over two thousand small ones is visible
 * before it is requested.
 */
export const SIZES = [
  { code: "large", label: "Large", count: 170 },
  { code: "medium", label: "Medium", count: 366 },
  { code: "small", label: "Small", count: 1029 },
  { code: "very_small", label: "Very small", count: 2134 },
] as const satisfies readonly { code: PortSize; label: string; count: number }[];

/** What the Port List API itself defaults to, and what this page opens on. */
export const DEFAULT_SIZES: PortSize[] = ["large"];

/** Rotterdam — the port the API reference uses in its own example. */
export const DEFAULT_PORT_ID = 31140;

export function isPortSize(value: string): value is PortSize {
  return SIZES.some((size) => size.code === value);
}

/** Keeps a list of sizes in the order the filter shows them, largest first. */
export function sortSizes(sizes: PortSize[]): PortSize[] {
  const order = SIZES.map((size) => size.code as PortSize);
  return [...sizes].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** "very_small" → "Very small" */
export function sizeLabel(size: PortSize): string {
  return SIZES.find((option) => option.code === size)?.label ?? size;
}

/** The three answers the index gives to "does this port have it?". */
export type Availability = "yes" | "no" | "unknown";

/**
 * Anything that is not a plain yes or no counts as unsurveyed. Ports the
 * index has little on answer "Unknown" for most of their entries, and reading
 * that as a no would invent a fact about the port.
 */
export function availability(value: string): Availability {
  const answer = value?.trim().toLowerCase();
  if (answer === "yes") return "yes";
  if (answer === "no") return "no";
  return "unknown";
}

/** The capability groups, in the order the details show them. */
export const CAPABILITY_GROUPS = [
  { key: "facilities", title: "Facilities" },
  { key: "cranes", title: "Cranes" },
  { key: "supplies", title: "Supplies" },
  { key: "services", title: "Services" },
  { key: "pilotage", title: "Pilotage" },
  { key: "tugs", title: "Tugs" },
  { key: "communications", title: "Connections" },
  { key: "entrance_restrictions", title: "Entrance restrictions" },
  { key: "quarantine", title: "Quarantine" },
  { key: "features", title: "Features" },
] as const satisfies readonly { key: keyof PortInfo; title: string }[];

/** The depths worth listing, in the order they are shown. */
export const DEPTH_FIELDS = [
  { key: "channel", label: "Channel" },
  { key: "anchorage", label: "Anchorage" },
  { key: "cargo_pier", label: "Cargo pier" },
  { key: "oil_terminal", label: "Oil terminal" },
  { key: "lng_terminal", label: "LNG terminal" },
  { key: "entrance_width", label: "Entrance width" },
  { key: "tidal_range", label: "Tidal range" },
] as const satisfies readonly { key: keyof Depths; label: string }[];

export const VESSEL_FIELDS = [
  { key: "length", label: "Length" },
  { key: "beam", label: "Beam" },
  { key: "draft", label: "Draft" },
] as const satisfies readonly { key: keyof VesselLimits; label: string }[];

/**
 * Keys the generic rule below would mangle: acronyms it would lowercase, and
 * the crane lifts whose tonnage bands are digits joined by underscores.
 */
const LABEL_OVERRIDES: Record<string, string> = {
  roro: "Ro-Ro",
  lng_terminal: "LNG terminal",
  eta_message: "ETA message",
  us_representative: "US representative",
  ukc_management_system: "UKC management system",
  nav_equipment: "Navigation equipment",
  med_mooring: "Mediterranean mooring",
  lifts_0_24_tons: "Lifts up to 24 t",
  lifts_25_49_tons: "Lifts 25–49 t",
  lifts_50_100_tons: "Lifts 50–100 t",
  lifts_100_tons_plus: "Lifts over 100 t",
  code: "Overall",
};

/** "dirty_ballast_disposal" → "Dirty ballast disposal" */
export function fieldLabel(key: string): string {
  const override = LABEL_OVERRIDES[key];
  if (override) return override;

  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "51.90000, 4.48333" */
export function formatCoordinates(port: Port): string {
  return `${port.latitude.toFixed(5)}, ${port.longitude.toFixed(5)}`;
}

/** "11" → "11 m". Whole metres stay whole. */
export function formatMetres(value: number): string {
  return `${Number(value.toFixed(1))} m`;
}

/**
 * The index tags a region with its own numbering, as in
 * "Netherlands -- 30980". That number indexes the publication, not the world,
 * so only the name is shown.
 */
export function regionName(region: string): string {
  return region.replace(/\s*--\s*\d+\s*$/, "").trim();
}

/** Values the index writes when it means "nothing recorded". */
export function isBlank(value: string | null | undefined): boolean {
  if (!value) return true;
  const text = value.trim().toLowerCase();
  return text === "" || text === "none" || text === "unknown";
}

/** A value for a detail row, or an em space when the index has none. */
export function orUnknown(value: string | null | undefined): string {
  return isBlank(value) ? "Unknown" : value!.trim();
}

/** True when at least one of the three dimensions was recorded. */
export function hasVesselLimits(limits: VesselLimits): boolean {
  return VESSEL_FIELDS.some((field) => limits[field.key] !== null);
}
