import type { Metadata } from "next";
import { searchPlaces } from "./api";
import { GeoSearchPanel } from "./components/geo-search-panel";
import { DEFAULT_LANGUAGE, DEFAULT_QUERY, type Place } from "./utils";

export const metadata: Metadata = {
  title: "Geo Search — Infoplaza Platform Examples",
};

/**
 * The results for the default term are loaded here so the page arrives with
 * content; every later search is a keystroke away in the panel.
 */
async function initialResults(): Promise<{
  places: Place[];
  error: string | null;
}> {
  try {
    return {
      places: await searchPlaces(DEFAULT_QUERY, DEFAULT_LANGUAGE),
      error: null,
    };
  } catch (error) {
    return {
      places: [],
      error:
        error instanceof Error ? error.message : "Failed to search places.",
    };
  }
}

export default async function GeoSearchPage() {
  const { places, error } = await initialResults();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Geo
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Geo Search</h1>
      <p className="mt-2 text-gray-600">
        Look up a place by name with the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-geo-search"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Geo Search API
        </a>{" "}
        and see every match as a list and on the map, with the coordinates,
        country and timezone the API returns for each one. Those coordinates
        are what the rest of the Platform APIs take as input.
      </p>

      <div className="mt-8">
        <GeoSearchPanel initialPlaces={places} initialError={error} />
      </div>
    </div>
  );
}
