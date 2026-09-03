"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import {
  causeColor,
  causeLabel,
  formatTime,
  locationLabel,
  type TrafficEvent,
  type TrafficSummary,
} from "../utils";

/**
 * Ties the example together: the same events on the map and in the list, with
 * one selection shared between them.
 *
 * The traffic is fetched here rather than during server rendering, so the map
 * and the list are built in the browser only. That keeps MapLibre away from
 * the server and keeps the times in the list the visitor's own: they are
 * formatted in the local zone, which the server does not know.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const TrafficMap = dynamic(() => import("./traffic-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
  ),
});

/** What the route handler in events/ returns. */
interface TrafficResponse {
  events?: TrafficEvent[];
  summary?: TrafficSummary;
}

export function TrafficPanel() {
  const [traffic, setTraffic] = useState<{
    events: TrafficEvent[];
    summary: TrafficSummary;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // One call on mount: the route handler talks to both APIs and merges them.
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const body = await fetchJson<TrafficResponse>(
          "/mobility/traffic/events",
          controller.signal,
        );

        if (!body.events || !body.summary) {
          throw new Error("Failed to load traffic.");
        }
        setTraffic({ events: body.events, summary: body.summary });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : "Failed to load traffic.",
        );
      }
    })();

    return () => controller.abort();
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (!traffic) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded bg-gray-100" />
        <div className="h-[460px] w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  const { events, summary } = traffic;

  return (
    <div className="space-y-6">
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        <Stat label="Jams" value={summary.jams} />
        <Stat label="Total length" value={`${summary.length} km`} />
        <Stat label="Events" value={summary.events} />
        <Stat label="Updated" value={formatTime(summary.updated)} />
      </dl>

      <TrafficMap
        events={events}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <p className="text-xs text-gray-500">
        Hover a road or a dot on the map for the details, click it to select
        the event, or pick one from the list.
      </p>

      <section>
        <h2 className="text-sm font-medium text-gray-900">
          All events
          <span className="ml-2 font-normal text-gray-400">
            {events.length}
          </span>
        </h2>

        {events.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">
            Nothing on the roads right now.
          </p>
        )}

        <ul className="mt-2 divide-y divide-gray-100">
          {events.map((event) => {
            const isSelected = event.id === selectedId;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(event.id)}
                  className={`flex w-full items-start gap-3 py-2.5 text-left transition-colors ${
                    isSelected ? "text-blue-700" : "hover:text-gray-500"
                  }`}
                >
                  <span
                    className="mt-0.5 w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-semibold text-white"
                    style={{ backgroundColor: causeColor(event.causeType) }}
                    title={causeLabel(event.causeType)}
                  >
                    {event.roadNumber === "?" ? "–" : event.roadNumber}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {locationLabel(event)}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {event.description}
                    </span>
                    <span className="block truncate text-xs text-gray-400">
                      {[
                        causeLabel(event.causeType),
                        event.cause,
                        `since ${formatTime(event.startTime)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    {event.delayMinutes > 0 ? (
                      <span className="block text-sm tabular-nums text-red-600">
                        +{event.delayMinutes} min
                      </span>
                    ) : (
                      <span className="block text-sm text-gray-400">–</span>
                    )}
                    {event.queueKm > 0 && (
                      <span className="block text-xs tabular-nums text-gray-500">
                        {event.queueKm} km
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-gray-900">
        {value}
      </dd>
    </div>
  );
}
