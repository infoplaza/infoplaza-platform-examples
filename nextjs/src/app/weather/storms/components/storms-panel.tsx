"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import {
  CATEGORIES,
  DEFAULT_SPEED_UNIT,
  SPEED_UNITS,
  basinName,
  categoryMeta,
  formatSpeed,
  formatTimestamp,
  isSpeedUnit,
  latestPoint,
  type SpeedUnit,
  type Storm,
} from "../utils";
import { CategoryPill } from "./category-pill";
import { StormDetails } from "./storm-details";

/**
 * Ties the example together: the same storms on the globe and in the list,
 * one selection shared between them, and the selected storm in full below.
 *
 * The storms are fetched here rather than during server rendering, so the
 * map is built in the browser only. That keeps MapLibre away from the server
 * and keeps the times in the tables the visitor's own: they are formatted in
 * the local zone, which the server does not know.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const StormsMap = dynamic(() => import("./storms-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
  ),
});

/** Where the chosen unit is kept, so it carries across visits and reloads. */
const UNIT_STORAGE_KEY = "infoplaza-examples:storms-speed-unit";

/**
 * The speed unit, kept in local storage rather than in state.
 *
 * The server cannot know what this browser last chose, so it is read after
 * hydration through `useSyncExternalStore`: the server snapshot is the
 * default, the browser snapshot is whatever was stored.
 */
const unitListeners = new Set<() => void>();

function subscribeToUnit(listener: () => void): () => void {
  unitListeners.add(listener);
  return () => {
    unitListeners.delete(listener);
  };
}

function readUnit(): SpeedUnit {
  try {
    const stored = window.localStorage.getItem(UNIT_STORAGE_KEY);
    return isSpeedUnit(stored) ? stored : DEFAULT_SPEED_UNIT;
  } catch {
    // Storage can be switched off entirely, which is not worth failing over.
    return DEFAULT_SPEED_UNIT;
  }
}

function writeUnit(unit: SpeedUnit): void {
  try {
    window.localStorage.setItem(UNIT_STORAGE_KEY, unit);
  } catch {
    // Nothing to do: the unit still changes, it just will not be remembered.
  }
  for (const listener of unitListeners) listener();
}

export function StormsPanel() {
  const [loaded, setLoaded] = useState<{
    storms: Storm[];
    /** When they arrived, which is what forecast and "ago" are measured from. */
    now: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const unit = useSyncExternalStore(
    subscribeToUnit,
    readUnit,
    () => DEFAULT_SPEED_UNIT,
  );

  // One call on mount: the endpoint has no parameters and returns every
  // active storm at once, so there is nothing to ask for later.
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const body = await fetchJson<{ storms?: Storm[] }>(
          "/weather/storms/active",
          controller.signal,
        );
        if (!body.storms) throw new Error("Failed to load storms.");

        setLoaded({ storms: body.storms, now: Date.now() });
        // The route sorts them strongest first, so the page opens on the one
        // most worth looking at.
        setSelectedId(body.storms[0]?.id ?? null);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : "Failed to load storms.",
        );
      }
    })();

    return () => controller.abort();
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (!loaded) {
    return (
      <div className="space-y-6">
        <div className="h-[74px] w-full animate-pulse rounded-lg bg-cloud-dark" />
        <div className="h-[520px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
      </div>
    );
  }

  const { storms, now } = loaded;
  const selected = storms.find((storm) => storm.id === selectedId) ?? null;
  const strongest = storms[0];
  const named = storms.filter(
    (storm) => categoryMeta(storm.category).rank >= categoryMeta("TS").rank,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-cloud-dark bg-white p-5">
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          <Stat label="Active systems" value={storms.length} />
          <Stat label="Tropical storm or stronger" value={named.length} />
          <Stat
            label="Strongest wind"
            value={
              strongest
                ? `${formatSpeed(strongest.current.windSpeed, unit)} · ${strongest.nameShort}`
                : "–"
            }
          />
        </dl>

        <div
          className="flex rounded-md border border-cloud-dark bg-white p-0.5"
          role="group"
          aria-label="Speed unit"
        >
          {SPEED_UNITS.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => writeUnit(option.code)}
              aria-pressed={option.code === unit}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                option.code === unit
                  ? "bg-dark text-white"
                  : "text-dark/80 hover:bg-cloud"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <StormsMap
        storms={storms}
        now={now}
        selectedId={selectedId}
        unit={unit}
        onSelect={setSelectedId}
      />

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-dark/70">
        <p>
          Hover a dot on a track for the readings at that moment, click a storm
          to select it, or pick one from the list.
        </p>
        <Legend />
      </div>

      {storms.length === 0 ? (
        <p className="rounded-lg border border-cloud-dark bg-white p-5 text-sm text-dark/70">
          No tropical storms are active anywhere right now. The season peaks
          from August to October north of the equator, and from January to
          March south of it.
        </p>
      ) : (
        <section className="rounded-lg border border-cloud-dark bg-white p-5">
          <h2 className="text-sm font-medium text-dark">
            Active storms
            <span className="ml-2 font-normal text-dark/50">
              {storms.length}
            </span>
          </h2>

          <ul className="mt-2 divide-y divide-cloud">
            {storms.map((storm) => {
              const isSelected = storm.id === selectedId;
              return (
                <li key={storm.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(storm.id)}
                    className={`flex w-full items-center gap-3 py-2.5 text-left transition-colors ${
                      isSelected ? "text-marine" : "hover:text-dark/70"
                    }`}
                  >
                    <CategoryPill category={storm.category} />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {storm.name}
                      </span>
                      <span className="block truncate text-xs text-dark/50">
                        {[
                          basinName(storm),
                          `last seen ${formatTimestamp(latestPoint(storm, now).timestamp)}`,
                        ].join(" · ")}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-sm tabular-nums">
                        {formatSpeed(storm.current.windSpeed, unit)}
                      </span>
                      <span className="block text-xs tabular-nums text-dark/50">
                        gusts {formatSpeed(storm.current.gustSpeed, unit)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {selected && <StormDetails storm={selected} now={now} unit={unit} />}
    </div>
  );
}

/** What the colours and line styles on the map mean. */
function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {Object.entries(CATEGORIES).map(([code, meta]) => (
        <li key={code} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          {meta.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="w-4 border-t-2 border-dashed border-dark/60" />
        Forecast
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-sm border border-dark/40 bg-dark/10" />
        Forecast cone
      </li>
    </ul>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-dark/50">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-dark">{value}</dd>
    </div>
  );
}
