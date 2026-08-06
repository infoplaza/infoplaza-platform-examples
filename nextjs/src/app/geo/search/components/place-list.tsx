"use client";

import { useSyncExternalStore } from "react";
import {
  countryFlag,
  formatCoordinates,
  localTime,
  placeKey,
  placeRegion,
  type Place,
} from "../utils";

/**
 * The matches as a list, numbered to line up with the markers on the map.
 *
 * Every match carries a timezone, so each row also shows what time it is
 * there.
 */

const TICK_MS = 30_000;

/**
 * The clock behind those times, as an external store rather than state: the
 * server has no meaningful "now" to render, and reading one during SSR would
 * leave a time on the page that the browser then disagrees with. Subscribing
 * to it instead means the server renders nothing and the browser fills it in.
 */
let clock: Date | null = null;

function subscribeToClock(onChange: () => void) {
  clock = new Date();
  const timer = setInterval(() => {
    clock = new Date();
    onChange();
  }, TICK_MS);
  return () => clearInterval(timer);
}

const readClock = () => clock;
const readClockOnServer = () => null;

interface PlaceListProps {
  places: Place[];
  selectedKey: string | null;
  onSelect(place: Place): void;
}

export function PlaceList({ places, selectedKey, onSelect }: PlaceListProps) {
  const now = useSyncExternalStore(
    subscribeToClock,
    readClock,
    readClockOnServer,
  );

  return (
    <ul className="divide-y divide-gray-100">
      {places.map((place, index) => {
        const key = placeKey(place);
        const isSelected = key === selectedKey;
        const time = now ? localTime(place.timezone, now) : null;

        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSelect(place)}
              className={`flex w-full items-start gap-3 py-3 text-left transition-colors ${
                isSelected ? "text-blue-700" : "text-gray-900 hover:text-gray-500"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${
                  isSelected ? "bg-blue-600" : "bg-gray-900"
                }`}
              >
                {index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {place.name}{" "}
                  <span aria-hidden>{countryFlag(place.country.code)}</span>
                </span>
                <span className="block truncate text-xs text-gray-500">
                  {placeRegion(place)}
                </span>
                <span className="block truncate font-mono text-xs text-gray-400">
                  {formatCoordinates(place)}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-xs tabular-nums text-gray-500">
                  {time ?? ""}
                </span>
                <span className="block text-xs text-gray-400">
                  {place.timezone}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
