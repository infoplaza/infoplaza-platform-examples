"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import type { AreaResult, StationResult } from "../api";
import {
  AREA_LIMIT,
  DEFAULT_DISTANCE,
  DISTANCE_OPTIONS,
  fieldLabel,
  formatCoordinates,
  formatDistance,
  formatObserved,
  formatValue,
  HISTORY_LENGTHS,
  numericKeys,
  preferredKey,
  readings,
  stationName,
  unitOf,
  type AreaObservation,
  type Bounds,
  type HistoryLength,
  type LatLon,
  type NearbyStation,
  type Observation,
  type ObservationSource,
  type Station,
} from "../utils";
import { HistoryChart } from "./history-chart";
import type { MapLabel } from "./observations-map";
import { ReadingsList } from "./readings-list";

/**
 * Ties the example together, one endpoint per thing to do on the page:
 *
 * - the select lists the networks, from the Sources endpoint;
 * - picking one puts its stations on the map, from the Stations endpoint;
 * - clicking a station loads its latest observation, from the Station
 *   endpoint, and clicking anywhere else finds the nearest station and its
 *   latest observation, from the Point endpoint;
 * - the button under the map labels every station in view with its latest
 *   reading, from the Area endpoint;
 * - the history under the details draws the station's recent readings, from
 *   the Station endpoint again, as a series.
 *
 * Every lookup goes through the route handlers next to this component, so the
 * API key stays on the server. The networks and the opening station are
 * fetched during server rendering and handed in as props, so the page has
 * content on first paint; the stations, the slow part, are asked for once the
 * panel is on screen.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const ObservationsMap = dynamic(() => import("./observations-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
  ),
});

/** The station the details are about, and how it was arrived at. */
export interface Selection {
  station: Station | NearbyStation;
  /** Its latest observation. Null when it has reported nothing lately. */
  observation: Observation | null;
  via: "station" | "point" | "area";
}

interface ObservationsPanelProps {
  sources: ObservationSource[];
  initialSourceId: string;
  initialSelection: Selection | null;
  /** Set when the opening state failed to load. */
  initialError: string | null;
}

export function ObservationsPanel({
  sources,
  initialSourceId,
  initialSelection,
  initialError,
}: ObservationsPanelProps) {
  const [sourceId, setSourceId] = useState(initialSourceId);
  const source = sources.find((option) => option.id === sourceId) ?? null;

  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(
    source?.supports.station ?? false,
  );
  const [stationsError, setStationsError] = useState<string | null>(null);

  const [selection, setSelection] = useState<Selection | null>(
    initialSelection,
  );
  const [picked, setPicked] = useState<LatLon | null>(null);
  const [maxDistance, setMaxDistance] = useState(DEFAULT_DISTANCE);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(
    initialError,
  );
  /** Said instead of the details when a lookup found no station. */
  const [detailNotice, setDetailNotice] = useState<string | null>(null);

  const [chartKey, setChartKey] = useState<string | null>(() =>
    initialSelection?.observation
      ? preferredKey(numericKeys([initialSelection.observation]))
      : null,
  );
  const [historyLength, setHistoryLength] = useState<HistoryLength | null>(
    null,
  );
  const [history, setHistory] = useState<Observation[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [view, setView] = useState<Bounds | null>(null);
  const [area, setArea] = useState<AreaResult | null>(null);
  const [areaKey, setAreaKey] = useState<string | null>(null);
  const [areaLoading, setAreaLoading] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  const sourceSelectId = `${useId()}-source`;
  const distanceSelectId = `${useId()}-distance`;
  const areaKeySelectId = `${useId()}-area-key`;
  const chartKeySelectId = `${useId()}-chart-key`;

  // One request in flight per kind: a quick second click aborts the first, so
  // it cannot be overtaken by the answer to it.
  const stationsRequestRef = useRef<AbortController | null>(null);
  const detailRequestRef = useRef<AbortController | null>(null);
  const historyRequestRef = useRef<AbortController | null>(null);
  const areaRequestRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      stationsRequestRef.current?.abort();
      detailRequestRef.current?.abort();
      historyRequestRef.current?.abort();
      areaRequestRef.current?.abort();
    },
    [],
  );

  function startRequest(ref: React.RefObject<AbortController | null>) {
    ref.current?.abort();
    const controller = new AbortController();
    ref.current = controller;
    return controller;
  }

  // The stations of the opening network are not part of the server render: a
  // network runs to thousands of them, which held the whole page back. They
  // are asked for here instead, once the page is on screen. A change of
  // network before they arrive aborts this request, like any other.
  useEffect(() => {
    const opening = sources.find((option) => option.id === initialSourceId);
    if (!opening?.supports.station) return;

    const controller = new AbortController();
    stationsRequestRef.current = controller;

    fetchJson<{ stations: Station[] }>(
      `/weather/observations/stations?source=${initialSourceId}`,
      controller.signal,
    ).then(
      (body) => {
        setStations(body.stations);
        setStationsLoading(false);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setStationsError(errorMessage(error, "Failed to load stations."));
        setStationsLoading(false);
      },
    );

    return () => controller.abort();
  }, [sources, initialSourceId]);

  /**
   * The readings of a station over time. Asked for only once a length has
   * been picked, because every reading in the answer is a credit.
   */
  async function loadHistory(
    forSource: ObservationSource,
    next: Selection,
    length: HistoryLength,
  ) {
    const controller = startRequest(historyRequestRef);
    setHistory(null);
    setHistoryError(null);
    setHistoryLoading(true);

    // The series ends at the latest reading rather than at now, so a network
    // that runs behind still has readings in it.
    const until = next.observation?.date ?? new Date().toISOString();

    try {
      const body = await fetchJson<StationResult>(
        `/weather/observations/station?source=${forSource.id}&stationId=${next.station.id}&readings=${length}&until=${encodeURIComponent(until)}`,
        controller.signal,
      );
      setHistory(body.observations);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setHistoryError(errorMessage(error, "Failed to load the history."));
    } finally {
      if (!controller.signal.aborted) setHistoryLoading(false);
    }
  }

  /**
   * Shows a station in the details, keeps the chart on the same value where
   * the new station measures it, and loads its history if one was asked for.
   */
  function select(next: Selection | null, forSource: ObservationSource | null) {
    setSelection(next);
    setDetailNotice(null);

    const keys = next?.observation ? numericKeys([next.observation]) : [];
    setChartKey((current) =>
      current && keys.includes(current) ? current : preferredKey(keys),
    );

    historyRequestRef.current?.abort();
    setHistory(null);
    setHistoryError(null);
    setHistoryLoading(false);
    if (next && forSource?.supports.station && historyLength) {
      loadHistory(forSource, next, historyLength);
    }
  }

  /** Clicking a station: its latest observation, by id. */
  async function selectStation(stationId: number) {
    if (!source) return;
    const controller = startRequest(detailRequestRef);
    const known = stations.find((station) => station.id === stationId);

    setPicked(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const body = await fetchJson<StationResult>(
        `/weather/observations/station?source=${source.id}&stationId=${stationId}`,
        controller.signal,
      );
      const station = body.station ?? known;
      if (!station) throw new Error("The station could not be found.");
      select(
        { station, observation: body.observations[0] ?? null, via: "station" },
        source,
      );
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setDetailError(errorMessage(error, "Failed to load the station."));
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }

  /** Clicking anywhere else: the nearest station within range, if any. */
  async function lookupPoint(
    location: LatLon,
    forSource: ObservationSource,
    distance: number,
  ) {
    const controller = startRequest(detailRequestRef);
    setPicked(location);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const body = await fetchJson<StationResult>(
        `/weather/observations/point?source=${forSource.id}&lat=${location.latitude}&lon=${location.longitude}&maxDistance=${distance}`,
        controller.signal,
      );
      if (body.station) {
        select(
          {
            station: body.station,
            observation: body.observations[0] ?? null,
            via: "point",
          },
          forSource,
        );
      } else {
        select(null, forSource);
        setDetailNotice(
          `No ${forSource.name} station within ${distance} km of the pin. Click closer to a dot, or let the lookup reach further.`,
        );
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setDetailError(errorMessage(error, "Failed to look up the point."));
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }

  function pick(location: LatLon) {
    if (!source) return;
    if (!source.supports.point) {
      setPicked(null);
      setDetailNotice(movingSourceHint(source));
      return;
    }
    lookupPoint(location, source, maxDistance);
  }

  /** Picking a label: the observation already came with the area, so no call. */
  function selectLabel(stationId: number) {
    const observation = area?.observations.find(
      (entry) => entry.station.id === stationId,
    );
    if (!observation) return;
    detailRequestRef.current?.abort();
    setDetailLoading(false);
    setDetailError(null);
    setPicked(null);
    select({ station: observation.station, observation, via: "area" }, source);
  }

  /**
   * A new network: its stations on the map, the readings of the old one off
   * it, and the details moved to the nearest station of the new one — to the
   * spot that was looked up, or to where the shown station was.
   *
   * The stations go first. A network the endpoints refuse is refused by all
   * of them, so when the stations fail the lookup is not tried as well.
   */
  async function changeSource(id: string) {
    const next = sources.find((option) => option.id === id);
    if (!next) return;

    const anchor =
      picked ??
      (selection && {
        latitude: selection.station.lat,
        longitude: selection.station.lng,
      });

    setSourceId(id);
    clearArea();
    detailRequestRef.current?.abort();
    setDetailLoading(false);
    setDetailError(null);
    setPicked(null);
    select(null, next);

    const controller = startRequest(stationsRequestRef);
    setStations([]);
    setStationsError(null);

    // Aircraft, ships and balloons are not stations: the Stations, Point and
    // Station endpoints refuse those sources, so none of them is asked.
    if (!next.supports.station) {
      setStationsLoading(false);
      setDetailNotice(movingSourceHint(next));
      return;
    }

    setStationsLoading(true);
    try {
      const body = await fetchJson<{ stations: Station[] }>(
        `/weather/observations/stations?source=${id}`,
        controller.signal,
      );
      setStations(body.stations);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setStationsError(errorMessage(error, "Failed to load stations."));
      return;
    } finally {
      if (!controller.signal.aborted) setStationsLoading(false);
    }

    if (anchor && next.supports.point) lookupPoint(anchor, next, maxDistance);
  }

  /** The latest reading of every station in view, up to AREA_LIMIT of them. */
  async function loadArea() {
    if (!source || !view) return;
    const controller = startRequest(areaRequestRef);
    setAreaError(null);
    setAreaLoading(true);

    try {
      const body = await fetchJson<AreaResult>(
        `/weather/observations/area?source=${source.id}&bounds=${view.join(",")}`,
        controller.signal,
      );
      setArea(body);
      const keys = numericKeys(body.observations);
      setAreaKey((current) =>
        current && keys.includes(current) ? current : preferredKey(keys),
      );
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setArea(null);
      setAreaError(errorMessage(error, "Failed to load the readings."));
    } finally {
      if (!controller.signal.aborted) setAreaLoading(false);
    }
  }

  function clearArea() {
    areaRequestRef.current?.abort();
    setArea(null);
    setAreaError(null);
    setAreaLoading(false);
  }

  function chooseHistory(length: HistoryLength) {
    setHistoryLength(length);
    if (selection && source?.supports.station) {
      loadHistory(source, selection, length);
    }
  }

  const areaKeys = useMemo(
    () => (area ? numericKeys(area.observations) : []),
    [area],
  );
  const labels = useMemo(
    () => (area && areaKey ? toLabels(area.observations, areaKey) : []),
    [area, areaKey],
  );
  const areaUnit = useMemo(() => {
    const sample = area?.observations.find((entry) => areaKey && areaKey in entry.values);
    return sample && areaKey ? unitOf(areaKey, sample.values) : null;
  }, [area, areaKey]);

  const rows = useMemo(
    () => (selection?.observation ? readings(selection.observation.values) : []),
    [selection],
  );
  const chartKeys = useMemo(
    () => (history ? numericKeys(history) : []),
    [history],
  );
  const chartUnit =
    chartKey && selection?.observation
      ? unitOf(chartKey, selection.observation.values)
      : null;

  const stationSources = sources.filter((option) => option.supports.station);
  const movingSources = sources.filter((option) => !option.supports.station);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor={sourceSelectId} className="text-dark/80">
            Network
          </label>
          <select
            id={sourceSelectId}
            value={sourceId}
            onChange={(event) => changeSource(event.target.value)}
            className="max-w-[min(28rem,80vw)] rounded-md border border-cloud-dark bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            <optgroup label="Stations">
              {stationSources.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </optgroup>
            {movingSources.length > 0 && (
              <optgroup label="Moving platforms">
                {movingSources.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {source && (
          <p className="min-w-0 flex-1 basis-80 text-xs text-dark/70">
            {source.description}
          </p>
        )}
      </div>

      <ObservationsMap
        stations={stations}
        active={selection?.station ?? null}
        picked={picked}
        labels={labels}
        onSelectStation={selectStation}
        onPick={pick}
        onSelectLabel={selectLabel}
        onViewChange={setView}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-dark/70">
          {stationsLoading
            ? "Loading stations…"
            : source?.supports.station
              ? `${stations.length.toLocaleString("en-GB")} stations. Click one for its latest readings, or click anywhere else for the nearest one.`
              : "No fixed stations: read the observations in view instead."}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {source?.supports.point && (
            <span className="flex items-center gap-2">
              <label htmlFor={distanceSelectId} className="text-dark/80">
                Look within
              </label>
              <select
                id={distanceSelectId}
                value={maxDistance}
                onChange={(event) => setMaxDistance(Number(event.target.value))}
                className="rounded-md border border-cloud-dark bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                {DISTANCE_OPTIONS.map((distance) => (
                  <option key={distance} value={distance}>
                    {distance} km
                  </option>
                ))}
              </select>
            </span>
          )}

          <button
            type="button"
            onClick={loadArea}
            disabled={!view || !source?.supports.area || areaLoading}
            className="rounded-md bg-dark px-3 py-1.5 text-sm font-medium text-white hover:bg-dark/85 disabled:opacity-50"
          >
            {areaLoading
              ? "Loading readings…"
              : area
                ? "Reload readings in view"
                : "Show readings in view"}
          </button>
        </div>
      </div>

      {stationsError && <p className="text-sm text-red-600">{stationsError}</p>}

      {(area || areaError) && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cloud-dark bg-white px-5 py-3 text-sm">
          {areaError ? (
            <p className="text-red-600">{areaError}</p>
          ) : (
            area && (
              <p className="text-dark/80">
                Latest readings of {area.observations.length}{" "}
                {source?.supports.station ? "stations" : "platforms"} in view,
                one credit each.
                {area.hasMore &&
                  ` The view holds more than ${AREA_LIMIT}; zoom in to read the rest.`}{" "}
                Click a label for the station.
              </p>
            )
          )}

          <div className="flex items-center gap-3">
            {areaKeys.length > 0 && (
              <span className="flex items-center gap-2">
                <label htmlFor={areaKeySelectId} className="text-dark/80">
                  Show
                </label>
                <select
                  id={areaKeySelectId}
                  value={areaKey ?? ""}
                  onChange={(event) => setAreaKey(event.target.value)}
                  className="max-w-56 rounded-md border border-cloud-dark bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  {areaKeys.map((key) => (
                    <option key={key} value={key}>
                      {fieldLabel(key)}
                    </option>
                  ))}
                </select>
                {areaUnit && <span className="text-dark/50">{areaUnit}</span>}
              </span>
            )}
            <button
              type="button"
              onClick={clearArea}
              className="text-sm text-dark/70 hover:text-dark hover:underline"
            >
              Clear
            </button>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-cloud-dark bg-white p-5">
        {detailLoading && (
          <p className="text-sm text-dark/70">Looking up the station…</p>
        )}
        {!detailLoading && detailError && (
          <p className="text-sm text-red-600">{detailError}</p>
        )}
        {!detailLoading && !detailError && detailNotice && (
          <p className="text-sm text-dark/70">{detailNotice}</p>
        )}
        {!detailLoading && !detailError && !detailNotice && !selection && (
          <p className="text-sm text-dark/70">
            Click a station on the map to see what it measured.
          </p>
        )}

        {!detailLoading && !detailError && selection && (
          <>
            <StationHeader selection={selection} />

            {selection.observation ? (
              <div className="mt-4">
                {/* Only a station has a history to draw, so the values are
                    only offered to the chart for networks of stations. */}
                <ReadingsList
                  readings={rows}
                  chartKey={source?.supports.station ? chartKey : null}
                  onChart={source?.supports.station ? setChartKey : undefined}
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-dark/70">
                This station has not reported lately.
              </p>
            )}
          </>
        )}
      </section>

      {selection && source?.supports.station && !detailLoading && (
        <section className="rounded-lg border border-cloud-dark bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-dark">
              History
              {chartKey && (
                <span className="ml-2 font-normal text-dark/50">
                  {fieldLabel(chartKey)}
                  {chartUnit && `, ${chartUnit}`}
                </span>
              )}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {chartKeys.length > 0 && (
                <span className="flex items-center gap-2">
                  <label htmlFor={chartKeySelectId} className="sr-only">
                    Value
                  </label>
                  <select
                    id={chartKeySelectId}
                    value={chartKey ?? ""}
                    onChange={(event) => setChartKey(event.target.value)}
                    className="max-w-56 rounded-md border border-cloud-dark bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                  >
                    {chartKeys.map((key) => (
                      <option key={key} value={key}>
                        {fieldLabel(key)}
                      </option>
                    ))}
                  </select>
                </span>
              )}
              <div
                role="group"
                aria-label="Readings to load"
                className="flex overflow-hidden rounded-md border border-cloud-dark"
              >
                {HISTORY_LENGTHS.map((length) => (
                  <button
                    key={length}
                    type="button"
                    onClick={() => chooseHistory(length)}
                    aria-pressed={historyLength === length}
                    className={`px-3 py-1.5 tabular-nums ${
                      historyLength === length
                        ? "bg-marine text-white"
                        : "bg-white text-dark/80 hover:bg-cloud"
                    }`}
                  >
                    {length}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            {historyLength === null && (
              <p className="text-sm text-dark/70">
                Pick how many of the station&apos;s latest readings to draw.
                Each reading in the answer costs a credit, so 144 is a day of
                ten-minute readings for 144 credits.
              </p>
            )}
            {historyLoading && (
              <p className="text-sm text-dark/70">Loading readings…</p>
            )}
            {historyError && (
              <p className="text-sm text-red-600">{historyError}</p>
            )}
            {history && !historyLoading && history.length === 0 && (
              <p className="text-sm text-dark/70">
                No readings in the 31 days up to the latest one.
              </p>
            )}
            {history && !historyLoading && history.length > 0 && chartKey && (
              <>
                <HistoryChart
                  observations={history}
                  valueKey={chartKey}
                  unit={chartUnit}
                />
                <p className="mt-2 text-xs text-dark/60">
                  {history.length} readings, from{" "}
                  {formatObserved(history[history.length - 1].date)} to{" "}
                  {formatObserved(history[0].date)}. Pick a value in the list
                  above to draw it instead.
                </p>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/** Which station the details are about, where it is, and when it last spoke. */
function StationHeader({ selection }: { selection: Selection }) {
  const { station, observation, via } = selection;
  const distance = "distance" in station ? station.distance : null;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <div>
        <h2 className="text-base font-semibold text-dark">
          {stationName(station)}
        </h2>
        <p className="mt-0.5 text-xs text-dark/60 tabular-nums">
          Station {station.id} · {formatCoordinates(station.lat, station.lng)}
          {station.elevation !== null && ` · ${station.elevation} m`}
          {via === "point" &&
            distance !== null &&
            ` · ${formatDistance(distance)} from the pin`}
          {via === "area" && " · from the readings in view"}
        </p>
      </div>
      {observation && (
        <p className="text-sm text-dark/80">
          Observed {formatObserved(observation.date)}
        </p>
      )}
    </div>
  );
}

/** The readings in view as map labels, for the stations that have the value. */
function toLabels(observations: AreaObservation[], key: string): MapLabel[] {
  return observations.flatMap((observation) => {
    const value = observation.values[key];
    if (typeof value !== "number") return [];
    return [
      {
        id: observation.station.id,
        lat: observation.station.lat,
        lng: observation.station.lng,
        text: formatValue(value),
      },
    ];
  });
}

/** What to say about a network whose platforms move rather than stand. */
function movingSourceHint(source: ObservationSource): string {
  return `${source.name} come from platforms on the move rather than from stations, so there is nothing to look up by point or by id. Show the readings in view to see where they are now.`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
