import { platformGet, type Endpoint } from "@/lib/platform";
import { platformUrl } from "@/lib/platform-url";
import {
  AREA_LIMIT,
  MAX_PERIOD_DAYS,
  type AreaObservation,
  type Bounds,
  type HistoryLength,
  type NearbyStation,
  type Observation,
  type ObservationSource,
  type Station,
} from "./utils";

/**
 * Server-side client for the five Observations endpoints.
 *
 * All five are plain REST endpoints that take the API key as a query
 * parameter, so they are called from the server only and the browser talks to
 * the route handlers next to this file instead. That keeps the key out of the
 * client bundle.
 *
 * The calls go out through @/lib/platform, which attaches the key and records
 * each request and its answer for the API log on the page.
 */

const SOURCES: Endpoint = {
  name: "Observation Sources",
  url: platformUrl("v1/observations/sources"),
  docsUrl: "https://platform.infoplaza.com/reference/v1-observations-sources",
};

const STATIONS: Endpoint = {
  name: "Observation Stations",
  url: platformUrl("v1/observations/stations"),
  docsUrl: "https://platform.infoplaza.com/reference/v1-observations-stations",
};

const AREA: Endpoint = {
  name: "Observations Area",
  url: platformUrl("v1/observations/area"),
  docsUrl: "https://platform.infoplaza.com/reference/v1-observations-area",
};

const POINT: Endpoint = {
  name: "Observations Point",
  url: platformUrl("v1/observations/point"),
  docsUrl: "https://platform.infoplaza.com/reference/v1-observations-point",
};

const STATION: Endpoint = {
  name: "Observations Station",
  url: platformUrl("v1/observations/station"),
  docsUrl: "https://platform.infoplaza.com/reference/v1-observations-station",
};

/** The most stations one page of the Stations endpoint holds. */
const STATIONS_PER_PAGE = 5000;

/**
 * How many pages of stations to follow. The largest network, WMO SYNOP, has
 * about 14,600 stations, which is three.
 */
const MAX_STATION_PAGES = 5;

/**
 * Several endpoints refuse a request without failing it: they answer
 * `success: true` with an `error` string where the payload should be — a
 * source the endpoint does not take, a period longer than 31 days. That case
 * is turned into a real failure here.
 */
function unwrap<T extends object>(data: T | { error: string }): T {
  if ("error" in data) throw new Error(String(data.error));
  return data;
}

/** Every network the API reads from, and which endpoints take it. */
export async function observationSources(): Promise<ObservationSource[]> {
  const data = await platformGet<{ sources: ObservationSource[] }>(SOURCES);
  return data.sources ?? [];
}

interface StationsPage {
  stations: Station[];
  has_more: boolean;
}

/**
 * Every station of a network, wherever it is.
 *
 * A page costs one credit however many stations it holds, so the pages are
 * as large as the endpoint allows and followed until the list ends.
 */
export async function observationStations(source: string): Promise<Station[]> {
  const stations: Station[] = [];

  for (let page = 1; page <= MAX_STATION_PAGES; page += 1) {
    const data = unwrap(
      await platformGet<StationsPage | { error: string }>(STATIONS, {
        source,
        page: String(page),
        per_page: String(STATIONS_PER_PAGE),
      }),
    );
    stations.push(...data.stations);
    if (!data.has_more) break;
  }

  // WMO SYNOP lists a station without a position at 0°, 0°, in the Gulf of
  // Guinea, which is somewhere no reader of the map should be sent.
  return stations.filter((station) => station.lat !== 0 || station.lng !== 0);
}

/** What the Area endpoint answers with. */
export interface AreaResult {
  observations: AreaObservation[];
  /** True when the box holds more stations than the call returned. */
  hasMore: boolean;
}

/**
 * The latest observation of every station in a box.
 *
 * The call costs one credit per observation it returns, so the number of
 * them is capped at AREA_LIMIT here, on the server, where a caller cannot
 * raise it.
 */
export async function observationsInArea(
  source: string,
  bounds: Bounds,
): Promise<AreaResult> {
  const data = unwrap(
    await platformGet<
      { observations: AreaObservation[]; has_more: boolean } | { error: string }
    >(AREA, {
      source,
      bounds: bounds.join(","),
      per_page: String(AREA_LIMIT),
    }),
  );
  return { observations: data.observations ?? [], hasMore: data.has_more };
}

/** What a lookup of one station comes back with. */
export interface StationResult {
  /** Null when there is no station: nothing in range, or an unknown id. */
  station: NearbyStation | Station | null;
  /** Newest first. */
  observations: Observation[];
}

/**
 * The station nearest to a point, within `maxDistance` kilometres, and its
 * latest observation. A point with no station in range is not an error: it
 * comes back with `station: null`.
 */
export async function observationsAtPoint(
  source: string,
  latitude: number,
  longitude: number,
  maxDistance: number,
): Promise<StationResult> {
  const data = unwrap(
    await platformGet<
      { station: NearbyStation | null; observations: Observation[] } | {
        error: string;
      }
    >(POINT, {
      source,
      lat: String(latitude),
      lng: String(longitude),
      max_distance: String(maxDistance),
    }),
  );
  return { station: data.station, observations: data.observations ?? [] };
}

/**
 * One station by id: its latest observation, or with `history` the most
 * recent readings up to and including `until`.
 *
 * A series wants a period, and refuses one longer than 31 days, so the
 * history is asked for as the whole 31 days before `until` and cut short by
 * `per_page` — the answer comes newest first, so that keeps the newest ones.
 * Ending at the latest reading rather than at now is what makes it work for
 * the validated networks too, which run a day or two behind.
 */
export async function observationsAtStation(
  source: string,
  stationId: number,
  history?: { length: HistoryLength; until: Date },
): Promise<StationResult> {
  const params: Record<string, string> = {
    source,
    stationId: String(stationId),
  };

  if (history) {
    const start = new Date(
      history.until.getTime() - MAX_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );
    params.mode = "series";
    params.datetime_start = isoSeconds(start);
    params.datetime_end = isoSeconds(history.until);
    params.per_page = String(history.length);
  }

  const data = unwrap(
    await platformGet<
      { station: Station | null; observations: Observation[] } | {
        error: string;
      }
    >(STATION, params),
  );
  return { station: data.station, observations: data.observations ?? [] };
}

/** "2026-10-19T13:40:00Z": UTC, to the second. */
function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
