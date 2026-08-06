import type { Metadata } from "next";
import { nearbyPlaces } from "./api";
import { GeoNearbyPanel } from "./components/geo-nearby-panel";
import {
  DEFAULT_LOCATION,
  formatRadius,
  MAX_RADIUS,
  SEARCH_RADII,
  type NearbyPlace,
} from "./utils";

export const metadata: Metadata = {
  title: "Geo Nearby — Infoplaza Platform Examples",
};

/**
 * The places around the default location are loaded here so the page arrives
 * with content; every later lookup is a click away in the panel.
 */
async function initialPlaces(): Promise<{
  places: NearbyPlace[];
  error: string | null;
}> {
  try {
    return {
      places: await nearbyPlaces(
        DEFAULT_LOCATION.latitude,
        DEFAULT_LOCATION.longitude,
      ),
      error: null,
    };
  } catch (error) {
    return {
      places: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to load nearby places.",
    };
  }
}

export default async function GeoNearbyPage() {
  const { places, error } = await initialPlaces();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Geo
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Geo Nearby</h1>
      <p className="mt-2 text-gray-600">
        Pick a spot on the map to find the places around it with the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-geo-nearby"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Geo Nearby API
        </a>
        . One call answers with one place, the most prominent one within the
        radius asked for, so this example asks {SEARCH_RADII.length} times — from{" "}
        {formatRadius(SEARCH_RADII[0])} out to {formatRadius(MAX_RADIUS)} — and
        collects the distinct answers into the list below.
      </p>

      <div className="mt-8">
        <GeoNearbyPanel initialPlaces={places} initialError={error} />
      </div>
    </div>
  );
}
