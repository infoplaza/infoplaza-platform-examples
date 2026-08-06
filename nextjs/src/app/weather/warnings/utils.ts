/**
 * Client-side helpers and types for the Weather Warnings example. The shape
 * below covers the fields the API returns for a warning.
 */

/** One warning returned by the Weather Warnings API. */
export interface Warning {
  /** Category of the warning, e.g. "HighTemperature" or "Thunderstorm". */
  element: string;
  title: string;
  /** Multi-line description: what is expected, and what to do about it. */
  text: string;
  /** 1 green, 2 yellow, 3 orange, 4 red. */
  level: number;
  /** The meteorological service that issued it, as an ISO country code. */
  countryCode: string;
  /** False while the warning is still ahead of its start time. */
  active: boolean;
  activeStart: string;
  activeEnd: string;
  /** When this issue of the warning was published. */
  created: string;
}

/** A point on the map. */
export interface LatLon {
  latitude: number;
  longitude: number;
}

/**
 * The languages this example offers for the warning titles and texts.
 *
 * The API documents six — nl, en, de, fr, es, it — but at the time of writing
 * only these two answer dependably: the other four either fail outright for a
 * location that has warnings, or come back with the text translated and the
 * title left empty. Add them back here once that is fixed; nothing else in
 * this example needs to change, and a missing title already falls back to the
 * warning type.
 */
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

/** Berlin — the point the API reference uses in its own example. */
export const DEFAULT_LOCATION: LatLon = {
  latitude: 52.51,
  longitude: 13.26,
};

/** How a warning level is named and coloured. */
export interface LevelMeta {
  label: string;
  /** The colour the level is known by, used for pins and pills. */
  color: string;
  /** Foreground that stays readable on `color`. */
  textColor: string;
}

/**
 * European services warn in colour codes, and the numeric `level` is that
 * scale: green means nothing is expected, red means take action. The titles
 * the API returns name the same colours ("code ORANGE for extreme heat"), so
 * the palette below keeps the page and the text it shows in step.
 */
export const LEVELS: Record<number, LevelMeta> = {
  1: { label: "Green", color: "#16a34a", textColor: "#ffffff" },
  2: { label: "Yellow", color: "#eab308", textColor: "#111827" },
  3: { label: "Orange", color: "#f97316", textColor: "#ffffff" },
  4: { label: "Red", color: "#dc2626", textColor: "#ffffff" },
};

/** Shown when a location has nothing to warn about, and for unknown levels. */
export const NEUTRAL_LEVEL: LevelMeta = {
  label: "None",
  color: "#6b7280",
  textColor: "#ffffff",
};

export function levelMeta(level: number): LevelMeta {
  return LEVELS[level] ?? { ...NEUTRAL_LEVEL, label: `Level ${level}` };
}

/** The severest level among the warnings, or null when there are none. */
export function highestLevel(warnings: Warning[]): number | null {
  if (warnings.length === 0) return null;
  return warnings.reduce((highest, warning) => {
    return Math.max(highest, warning.level);
  }, 0);
}

/**
 * Warnings carry no identifier, and the same one comes back more than once:
 * a service reissues it unchanged with a newer `created`, and identical
 * entries can repeat within a single answer. What makes a warning itself
 * unique is therefore its content and the window it covers.
 */
export function warningKey(warning: Warning): string {
  return [
    warning.element,
    warning.level,
    warning.countryCode,
    warning.activeStart,
    warning.activeEnd,
    warning.title,
    warning.text,
  ].join("|");
}

/** Collapses repeated warnings, keeping the most recently issued one. */
export function dedupeWarnings(warnings: Warning[]): Warning[] {
  const byKey = new Map<string, Warning>();
  for (const warning of warnings) {
    const key = warningKey(warning);
    const kept = byKey.get(key);
    if (!kept || warning.created > kept.created) byKey.set(key, warning);
  }
  return [...byKey.values()];
}

/**
 * What is happening now first, then what is coming, each with the severest
 * warning at the top. Within a level the one starting soonest comes first.
 */
export function sortWarnings(warnings: Warning[]): Warning[] {
  return [...warnings].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.level !== b.level) return b.level - a.level;
    return a.activeStart.localeCompare(b.activeStart);
  });
}

/**
 * The headline of a warning. Not every translation carries one, so a warning
 * without a title falls back to what it is about.
 */
export function warningTitle(warning: Warning): string {
  return warning.title.trim() || elementLabel(warning.element);
}

/** "HighTemperature" → "High temperature" */
export function elementLabel(element: string): string {
  const words = element.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "2026-08-06T10:00:00.000Z" → "Thu 6 Aug, 12:00" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Thu 6 Aug, 12:00 – 20:00", or both dates when the window spans days. */
export function formatWindow(warning: Warning): string {
  const start = new Date(warning.activeStart);
  const end = new Date(warning.activeEnd);
  const time = (date: Date) =>
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  if (start.toDateString() === end.toDateString()) {
    return `${formatDateTime(warning.activeStart)} – ${time(end)}`;
  }
  return `${formatDateTime(warning.activeStart)} – ${formatDateTime(warning.activeEnd)}`;
}

/** "52.51000, 13.26000" */
export function formatCoordinates(point: LatLon): string {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

/**
 * "DE" → "🇩🇪". Flags are pairs of regional indicator symbols, which sit at a
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
