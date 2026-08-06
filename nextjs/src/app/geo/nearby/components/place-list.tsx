"use client";

import {
  countryFlag,
  distanceMeters,
  formatDistance,
  formatRadius,
  placeKey,
  placeRegion,
  type LatLon,
  type NearbyPlace,
} from "../utils";

/**
 * The places found around the picked point, in the order the radii found
 * them: the tightest circle first, so the list reads from the place you are in
 * outwards to the region it sits in.
 *
 * Each row also shows how far the place itself is, which the API does not
 * return: that distance is worked out here from the two coordinates.
 */

interface PlaceListProps {
  places: NearbyPlace[];
  /** The point the distances are measured from. */
  origin: LatLon;
  selectedKey: string | null;
  onSelect(place: NearbyPlace): void;
}

export function PlaceList({
  places,
  origin,
  selectedKey,
  onSelect,
}: PlaceListProps) {
  return (
    <ul className="divide-y divide-gray-100">
      {places.map((place) => {
        const key = placeKey(place);
        const isSelected = key === selectedKey;

        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSelect(place)}
              className={`flex w-full items-start gap-3 py-3 text-left transition-colors ${
                isSelected
                  ? "text-blue-700"
                  : "text-gray-900 hover:text-gray-500"
              }`}
            >
              <span
                aria-hidden
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  isSelected ? "bg-blue-600" : "bg-gray-900"
                }`}
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {place.name}{" "}
                  <span aria-hidden>{countryFlag(place.country.code)}</span>
                </span>
                <span className="block truncate text-xs text-gray-500">
                  {placeRegion(place)}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-xs tabular-nums text-gray-500">
                  {formatDistance(distanceMeters(origin, place))}
                </span>
                <span className="block text-xs tabular-nums text-gray-400">
                  within {formatRadius(place.radius)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
