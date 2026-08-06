import type { Metadata } from "next";
import { nearbyStops } from "./api";
import { TransitStopsPanel } from "./components/transit-stops-panel";
import { DEFAULT_LOCATION, sortByDistance, type StopPlace } from "./utils";

export const metadata: Metadata = {
  title: "Transit Stops — Infoplaza Platform Examples",
};

/**
 * The stops around the default location are loaded here so the page arrives
 * with content; every later lookup is a click away in the panel.
 */
async function initialStops(): Promise<{
  stops: StopPlace[];
  error: string | null;
}> {
  try {
    const stops = await nearbyStops(
      DEFAULT_LOCATION.latitude,
      DEFAULT_LOCATION.longitude,
    );
    return { stops: sortByDistance(stops, DEFAULT_LOCATION), error: null };
  } catch (error) {
    return {
      stops: [],
      error:
        error instanceof Error ? error.message : "Failed to load nearby stops.",
    };
  }
}

export default async function TransitStopsPage() {
  const { stops, error } = await initialStops();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Mobility
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Transit Stops</h1>
      <p className="mt-2 text-gray-600">
        Pick a spot on the map to find the transit stops around it with the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-transit-stop-nearby"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Transit Stop Nearby API
        </a>
        , then pick a stop to see the next hour of departures from the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-transit-stop-departures"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Transit Stop Departures API
        </a>
        .
      </p>

      <div className="mt-8">
        <TransitStopsPanel initialStops={stops} initialError={error} />
      </div>
    </div>
  );
}
