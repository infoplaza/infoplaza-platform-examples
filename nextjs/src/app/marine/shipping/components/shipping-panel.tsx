"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import {
  DEFAULT_SPEED_KNOTS,
  DEFAULT_WAYPOINTS,
  formatCoordinates,
  formatDistance,
  formatDuration,
  formatMoment,
  formatSpeed,
  fromDateTimeInput,
  ROUTINGS,
  toDateTimeInput,
  sailedDistances,
  waypointsOf,
  type PointForecast,
  type RouteForecast,
  type Routing,
  type Waypoint,
} from "../utils";
import { RouteTable } from "./forecast-tables";
import { WaypointForecast } from "./waypoint-forecast";

/**
 * Ties the example together: the waypoints on the map make a voyage, the
 * fields under it say when it leaves, how fast it goes and along which lines,
 * and the two APIs answer for the track and for a single waypoint on it.
 *
 * Both lookups go through the route handlers next to this component, so the
 * API key stays on the server. Everything is fetched from the browser, so the
 * page itself renders without waiting on the API.
 *
 * Neither answer is kept in a loading flag of its own. A request is named by
 * what was asked for, the answer is stored under that name, and the panel is
 * loading whenever the name of the answer it holds is not the name of the
 * question it is now asking. So a stale forecast can never be shown next to a
 * voyage it does not belong to.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const ShippingMap = dynamic(() => import("./shipping-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
  ),
});

/**
 * A voyage is refetched on every change to it, and the speed field changes
 * with every keystroke. This lets a number be typed out before it is asked
 * about.
 */
const SETTLE_MS = 400;

/**
 * The minute the panel opened, in the shape the departure field takes.
 *
 * Read through `useSyncExternalStore` rather than from state: the server has
 * no now to render — its clock would end up in the HTML and the visitor's in
 * the hydrated field, which React reads as a mismatch. So the server renders
 * an empty field and the browser fills it in on its first render, once, and
 * the field is the reader's from then on.
 */
const NEVER_CHANGES = () => () => {};

function useOpeningDeparture(): string {
  const opened = useRef<string | null>(null);

  return useSyncExternalStore(
    NEVER_CHANGES,
    useCallback(() => {
      opened.current ??= toDateTimeInput(Math.floor(Date.now() / 1000));
      return opened.current;
    }, []),
    () => "",
  );
}

/** An answer, and the question it answers. */
interface Answer<T> {
  key: string;
  value: T | null;
  error: string | null;
}

export function ShippingPanel() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() =>
    DEFAULT_WAYPOINTS.map((waypoint, index) => ({ id: index + 1, ...waypoint })),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const nextIdRef = useRef(DEFAULT_WAYPOINTS.length + 1);

  /**
   * The two settings are held as what their fields say rather than as
   * numbers, so a half-typed speed is a field being filled in rather than a
   * voyage at 1 knot. Clearing the departure is not a missing setting either:
   * the API reads no departure as leaving now, and answers with the moment it
   * used.
   *
   * The departure opens on the current minute and holds what was typed after
   * that, so `null` here means nothing has been typed yet rather than an
   * empty field.
   */
  const [typedStart, setTypedStart] = useState<string | null>(null);
  const openedAt = useOpeningDeparture();
  const startInput = typedStart ?? openedAt;
  const [speedInput, setSpeedInput] = useState(String(DEFAULT_SPEED_KNOTS));
  const [routing, setRouting] = useState<Routing>("rhumb");

  const start = fromDateTimeInput(startInput);
  const speedKnots = Number(speedInput);
  const speedIsValid = Number.isFinite(speedKnots) && speedKnots > 0;

  const [routeAnswer, setRouteAnswer] = useState<Answer<RouteForecast> | null>(
    null,
  );
  const [pointAnswer, setPointAnswer] = useState<Answer<PointForecast> | null>(
    null,
  );

  const selectedIndex = waypoints.findIndex(
    (waypoint) => waypoint.id === selectedId,
  );
  const selected = selectedIndex === -1 ? null : waypoints[selectedIndex];

  /** What is being asked, or null while there is no voyage to ask about. */
  const routeKey =
    waypoints.length >= 2 && speedIsValid
      ? [
          waypoints.map((waypoint) => `${waypoint.lat},${waypoint.lon}`).join(";"),
          start ?? "now",
          speedKnots,
          routing,
        ].join("|")
      : null;
  const pointKey = selected ? `${selected.lat},${selected.lon}` : null;

  const route = routeAnswer?.key === routeKey ? routeAnswer.value : null;
  const routeError = routeAnswer?.key === routeKey ? routeAnswer.error : null;
  const routeLoading = routeKey !== null && routeAnswer?.key !== routeKey;

  const point = pointAnswer?.key === pointKey ? pointAnswer.value : null;
  const pointError = pointAnswer?.key === pointKey ? pointAnswer.error : null;
  const pointLoading = pointKey !== null && pointAnswer?.key !== pointKey;

  /**
   * The voyage, from the map and the fields to the forecast along it. Every
   * change starts over: a new waypoint, a later departure, another speed and
   * another kind of line all move every position on the track, so there is
   * nothing of the previous answer to keep.
   */
  useEffect(() => {
    if (routeKey === null) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const value = await fetchRoute(
            { waypoints, start, speedKnots, routing },
            controller.signal,
          );
          setRouteAnswer({ key: routeKey, value, error: null });
        } catch (error: unknown) {
          if (controller.signal.aborted) return;
          setRouteAnswer({
            key: routeKey,
            value: null,
            error: errorMessage(error, "Failed to load the route."),
          });
        }
      })();
    }, SETTLE_MS);

    // Whatever is in flight when the voyage changes again is dropped, so a
    // quick second change cannot be overtaken by the answer to the first.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [routeKey, waypoints, start, speedKnots, routing]);

  /**
   * The point forecast at the selected waypoint. It only depends on where the
   * waypoint is, not on when the ship gets there — the endpoint hands over
   * the whole model run — so it is left alone by a change to the departure or
   * the speed.
   */
  useEffect(() => {
    if (pointKey === null || !selected) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const value = await fetchPoint(
          selected.lat,
          selected.lon,
          controller.signal,
        );
        setPointAnswer({ key: pointKey, value, error: null });
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setPointAnswer({
          key: pointKey,
          value: null,
          error: errorMessage(error, "Failed to load the forecast."),
        });
      }
    })();

    return () => controller.abort();
  }, [pointKey, selected]);

  /** A click on open water puts the next waypoint at the end of the voyage. */
  const addWaypoint = useCallback((lat: number, lon: number) => {
    const id = nextIdRef.current++;
    setWaypoints((current) => [...current, { id, lat, lon }]);
  }, []);

  const selectWaypoint = useCallback((id: number) => setSelectedId(id), []);

  /** Dragging a waypoint moves it, and with it every position after it. */
  const moveWaypoint = useCallback((id: number, lat: number, lon: number) => {
    setWaypoints((current) =>
      current.map((waypoint) =>
        waypoint.id === id ? { ...waypoint, lat, lon } : waypoint,
      ),
    );
  }, []);

  function removeWaypoint(id: number) {
    setWaypoints((current) => current.filter((waypoint) => waypoint.id !== id));
    if (id === selectedId) setSelectedId(null);
  }

  function clearWaypoints() {
    setWaypoints([]);
    setSelectedId(null);
  }

  /** When the ship is at the selected waypoint, once the route knows. */
  const arrivals = route ? waypointsOf(route) : [];
  const arrivalTime =
    selectedIndex === -1 ? null : (arrivals[selectedIndex]?.time ?? null);

  return (
    <div className="space-y-6">
      <ShippingMap
        waypoints={waypoints}
        routePoints={route?.points ?? null}
        selectedId={selectedId}
        onAdd={addWaypoint}
        onSelect={selectWaypoint}
        onMove={moveWaypoint}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-xs text-dark/70">
          Click the sea to add a waypoint, drag one to move it, click one for
          the forecast at it. Times are UTC.
        </p>

        <div className="flex flex-wrap items-end gap-4">
          <Field label="Departure" hint={start === null ? "now" : undefined}>
            <input
              type="datetime-local"
              value={startInput}
              onChange={(event) => setTypedStart(event.target.value)}
              className="rounded-md border border-cloud-dark bg-white px-2 py-1 text-sm tabular-nums"
            />
          </Field>

          <Field label="Speed">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={60}
                step={0.5}
                value={speedInput}
                onChange={(event) => setSpeedInput(event.target.value)}
                className="w-20 rounded-md border border-cloud-dark bg-white px-2 py-1 text-sm tabular-nums"
              />
              <span className="text-sm text-dark/70">kn</span>
            </div>
          </Field>

          <Field label="Routing">
            <select
              value={routing}
              onChange={(event) => setRouting(event.target.value as Routing)}
              className="rounded-md border border-cloud-dark bg-white px-2 py-1 text-sm"
            >
              {ROUTINGS.map((option) => (
                <option
                  key={option.code}
                  value={option.code}
                  title={option.description}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <WaypointStrip
        waypoints={waypoints}
        selectedId={selectedId}
        onSelect={selectWaypoint}
        onRemove={removeWaypoint}
        onClear={clearWaypoints}
      />

      {selected && (
        <WaypointForecast
          number={selectedIndex + 1}
          lat={selected.lat}
          lon={selected.lon}
          forecast={point}
          arrivalTime={arrivalTime}
          loading={pointLoading}
          error={pointError}
          onClose={() => setSelectedId(null)}
        />
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-dark">Along the route</h2>
          {route && (
            <p className="text-xs text-dark/70">
              Click a row for everything the models answered there.
            </p>
          )}
        </div>

        {waypoints.length < 2 && (
          <p className="text-sm text-dark/70">
            A voyage needs two waypoints. Click the sea to add
            {waypoints.length === 0 ? " them" : " another one"}.
          </p>
        )}
        {waypoints.length >= 2 && !speedIsValid && (
          <p className="text-sm text-dark/70">
            Fill in a speed in knots to work the voyage out.
          </p>
        )}
        {routeLoading && <p className="text-sm text-dark/70">Loading the route…</p>}
        {routeError && <p className="text-sm text-red-600">{routeError}</p>}

        {route && (
          <>
            <RouteSummary route={route} />
            <RouteTable
              route={route}
              selectedWaypoint={selectedIndex === -1 ? null : selectedIndex}
              onSelectWaypoint={(index) => {
                const waypoint = waypoints[index];
                if (waypoint) setSelectedId(waypoint.id);
              }}
            />
            <Models route={route} />
          </>
        )}
      </section>
    </div>
  );
}

/** The waypoints of the voyage, in the order they are sailed. */
function WaypointStrip({
  waypoints,
  selectedId,
  onSelect,
  onRemove,
  onClear,
}: {
  waypoints: Waypoint[];
  selectedId: number | null;
  onSelect(id: number): void;
  onRemove(id: number): void;
  onClear(): void;
}) {
  if (waypoints.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {waypoints.map((waypoint, index) => {
        const selected = waypoint.id === selectedId;
        return (
          <span
            key={waypoint.id}
            className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${
              selected
                ? "border-marine/30 bg-marine/5 text-marine"
                : "border-cloud-dark bg-white text-dark/80"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(waypoint.id)}
              className="flex items-center gap-2"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white ${
                  selected ? "bg-marine" : "bg-dark"
                }`}
              >
                {index + 1}
              </span>
              <span className="tabular-nums">
                {formatCoordinates(waypoint.lat, waypoint.lon)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(waypoint.id)}
              title={`Remove waypoint ${index + 1}`}
              className="text-dark/50 transition-colors hover:text-dark"
            >
              ×
            </button>
          </span>
        );
      })}

      <button
        type="button"
        onClick={onClear}
        className="text-xs text-dark/70 underline-offset-2 transition-colors hover:text-dark hover:underline"
      >
        Clear
      </button>
    </div>
  );
}

/**
 * What the voyage comes to: how far, how long, and when it gets in.
 *
 * Neither total is taken from the last position as it stands: the API counts
 * its distance and its elapsed time from the last waypoint, so on a voyage of
 * more than one leg both would report the last leg alone. The distance is the
 * legs added up, and the passage is simply the time from leaving to arriving.
 */
function RouteSummary({ route }: { route: RouteForecast }) {
  const last = route.points[route.points.length - 1];
  const sailed = sailedDistances(route.points);

  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-3 rounded-lg border border-cloud-dark bg-white p-4 text-sm">
      <Stat label="Distance">{formatDistance(sailed[sailed.length - 1])}</Stat>
      <Stat label="Passage">{formatDuration(last.time - route.start)}</Stat>
      <Stat label="Speed">{formatSpeed(route.speeds[0])}</Stat>
      <Stat label="Departure">{formatMoment(route.start)}</Stat>
      <Stat label="Arrival">{formatMoment(last.time)}</Stat>
      <Stat label="Routing">
        {ROUTINGS.find((option) => option.code === route.routing)?.label ??
          route.routing}
      </Stat>
    </dl>
  );
}

/** Which model runs the numbers above came out of. */
function Models({ route }: { route: RouteForecast }) {
  return (
    <p className="text-xs text-dark/50">
      {route.models
        .map((model) => `${model.key} (run ${formatMoment(model.runtime)})`)
        .join(" · ")}
    </p>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  /** What the field means while it is empty. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-dark/70">
        {label}
        {hint && <span className="ml-1 font-normal text-dark/50">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-dark/70">{label}</dt>
      <dd className="mt-0.5 text-dark tabular-nums">{children}</dd>
    </div>
  );
}

interface RouteQuery {
  waypoints: Waypoint[];
  /** Null to leave now, which is what the API does with no departure. */
  start: number | null;
  speedKnots: number;
  routing: Routing;
}

async function fetchRoute(
  { waypoints, start, speedKnots, routing }: RouteQuery,
  signal: AbortSignal,
): Promise<RouteForecast> {
  const params = new URLSearchParams({
    lats: waypoints.map((waypoint) => waypoint.lat).join(","),
    lons: waypoints.map((waypoint) => waypoint.lon).join(","),
    speed: String(speedKnots),
    routing,
  });
  if (start !== null) params.set("start", String(start));

  const body = await fetchJson<{ route: RouteForecast }>(
    `/marine/shipping/route?${params}`,
    signal,
  );
  return body.route;
}

async function fetchPoint(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<PointForecast> {
  const body = await fetchJson<{ forecast: PointForecast }>(
    `/marine/shipping/point?lat=${lat}&lon=${lon}`,
    signal,
  );
  return body.forecast;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
