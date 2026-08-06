import type { Metadata } from "next";
import { climateNormals } from "./api";
import { ClimatePanel } from "./components/climate-panel";
import {
  DEFAULT_GRANULARITY,
  DEFAULT_LOCATION,
  type Climate,
} from "./utils";

export const metadata: Metadata = {
  title: "Climate — Infoplaza Platform Examples",
};

/**
 * The climate year for the default location is loaded here so the page
 * arrives with content; every later location is a click on the map away.
 */
async function initialClimate(): Promise<{
  climate: Climate | null;
  error: string | null;
}> {
  try {
    return {
      climate: await climateNormals(
        DEFAULT_LOCATION.latitude,
        DEFAULT_LOCATION.longitude,
        DEFAULT_GRANULARITY,
      ),
      error: null,
    };
  } catch (error) {
    return {
      climate: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load climate data.",
    };
  }
}

export default async function ClimatePage() {
  const { climate, error } = await initialClimate();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Weather
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Climate</h1>
      <p className="mt-2 text-gray-600">
        Pick a location on the map to see what its year normally looks like,
        with the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-weather-climate"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Weather Climate API
        </a>
        . One call returns the whole year at that point: the average daily low
        and high, the rain, the sunshine and the wind for every month, half
        month or ten-day period. These are long-term averages, not a forecast,
        so they answer what an ordinary January looks like there rather than
        what next January will bring.
      </p>

      <div className="mt-8">
        <ClimatePanel initialClimate={climate} initialError={error} />
      </div>
    </div>
  );
}
