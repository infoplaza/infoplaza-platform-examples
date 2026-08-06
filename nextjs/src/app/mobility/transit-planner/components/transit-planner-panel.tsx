"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  formatDistance,
  formatDuration,
  formatTime,
  legEndpoints,
  legLabel,
  legStartTime,
  placeField,
  placeFieldCoordinates,
  plannerLabel,
  PlanResultJson,
  PlaceSuggestion,
  Trip,
} from "../utils";
import { PlaceInput } from "./place-input";

type Status = "idle" | "streaming" | "done" | "error";

/** Prefilled example trip, in the shape the search API returns. */
const DEFAULT_FROM: PlaceSuggestion = {
  name: "Amsterdam Centraal",
  city: "Amsterdam",
  type: "railStation",
  stopid: "NL:S:asd",
  location: { latitude: 52.37907127278363, longitude: 4.900129970858263 },
};

const DEFAULT_TO: PlaceSuggestion = {
  name: "Schiphol Airport",
  city: "Schiphol",
  type: "railStation",
  stopid: "NL:S:shl",
  location: { latitude: 52.30925105449091, longitude: 4.7618117695963145 },
};

export function TransitPlannerPanel() {
  const [from, setFrom] = useState(placeField(DEFAULT_FROM));
  const [to, setTo] = useState(placeField(DEFAULT_TO));
  const [results, setResults] = useState<PlanResultJson[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => () => socketRef.current?.close(), []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();

    const fromPlace = placeFieldCoordinates(from);
    const toPlace = placeFieldCoordinates(to);
    if (!fromPlace || !toPlace) {
      setStatus("error");
      setError("Pick a From and To location from the search suggestions.");
      return;
    }

    socketRef.current?.close();

    setResults([]);
    setError(null);
    setExpandedTrip(null);
    setStatus("streaming");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/mobility/transit-planner/proxy`,
    );
    socketRef.current = socket;

    socket.onopen = () => socket.send(JSON.stringify({ fromPlace, toPlace }));

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data as string);
      if (message.error) {
        setStatus("error");
        setError(message.error);
        socket.close();
        return;
      }
      setResults((previous) => [...previous, message as PlanResultJson]);
    };

    socket.onerror = () => {
      if (socketRef.current !== socket) return;
      setStatus("error");
      setError("Connection to the proxy failed.");
    };

    socket.onclose = () => {
      if (socketRef.current !== socket) return;
      setStatus((current) => (current === "streaming" ? "done" : current));
    };
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-3">
        <PlaceInput label="From" value={from} onChange={setFrom} />
        <PlaceInput label="To" value={to} onChange={setTo} />
        <button
          type="submit"
          className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Plan trip
        </button>
      </form>

      <div className="mt-6">
        {status === "streaming" && (
          <p className="text-sm text-gray-500">
            Streaming results{results.length > 0 && ` (${results.length} so far)`}…
          </p>
        )}
        {status === "done" && (
          <p className="text-sm text-gray-500">
            Done — received {results.length} result
            {results.length === 1 ? "" : "s"}.
          </p>
        )}
        {status === "error" && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-4 space-y-6">
        {results.map((result, resultIndex) => (
          <section key={resultIndex}>
            <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Result {resultIndex + 1} · {plannerLabel(result.planner)}
              {result.modifiers?.length ? ` · ${result.modifiers.join(", ")}` : ""}
            </h2>
            {result.errors?.map((resultError, errorIndex) => (
              <p key={errorIndex} className="mt-2 text-sm text-red-600">
                {resultError.message ?? resultError.code}
              </p>
            ))}
            <ul className="mt-2 space-y-3">
              {result.trips?.map((trip, tripIndex) => {
                const tripKey = `${resultIndex}-${trip.id ?? tripIndex}`;
                return (
                  <TripCard
                    key={tripKey}
                    trip={trip}
                    expanded={expandedTrip === tripKey}
                    onToggle={() =>
                      setExpandedTrip((current) =>
                        current === tripKey ? null : tripKey,
                      )
                    }
                  />
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function TripCard({
  trip,
  expanded,
  onToggle,
}: {
  trip: Trip;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-medium">
            {formatTime(trip.expectedStartTime ?? trip.aimedStartTime)}
            {" → "}
            {formatTime(trip.expectedEndTime ?? trip.aimedEndTime)}
          </span>
          <span className="flex items-center gap-2 text-sm text-gray-500">
            {formatDuration(trip.duration)} · {trip.transfers ?? 0} transfer
            {(trip.transfers ?? 0) === 1 ? "" : "s"}
            <svg
              viewBox="0 0 16 16"
              className={`h-3 w-3 fill-current transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="M8 11 2.5 5.5l1-1L8 9l4.5-4.5 1 1Z" />
            </svg>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {trip.legs?.map((leg, legIndex) => (
            <span
              key={leg.id ?? legIndex}
              className={`rounded px-2 py-0.5 text-xs ${
                leg.transitLeg || leg.flexibleLeg
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {legLabel(leg)}
            </span>
          ))}
        </div>
      </button>

      {expanded && (
        <ol className="border-t border-gray-200 px-4 py-3">
          {trip.legs?.map((leg, legIndex) => (
            <li
              key={leg.id ?? legIndex}
              className="flex gap-3 py-2 text-sm not-last:border-b not-last:border-gray-100"
            >
              <span className="w-12 shrink-0 font-mono text-gray-500">
                {formatTime(legStartTime(leg))}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-medium">{legLabel(leg)}</span>
                {leg.transitLeg?.line?.name && (
                  <span className="text-gray-500">
                    {" "}
                    · {leg.transitLeg.line.name}
                  </span>
                )}
                {legEndpoints(leg) && (
                  <p className="truncate text-gray-500">{legEndpoints(leg)}</p>
                )}
              </div>
              <span className="shrink-0 text-right text-gray-500">
                {formatDuration(leg.duration)}
                {formatDistance(leg.distance) && (
                  <span className="block text-xs">
                    {formatDistance(leg.distance)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
