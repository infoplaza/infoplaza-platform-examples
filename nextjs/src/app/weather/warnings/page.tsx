import type { Metadata } from "next";
import { weatherWarnings } from "./api";
import { WarningsPanel } from "./components/warnings-panel";
import { DEFAULT_LOCATION, type Warning } from "./utils";

export const metadata: Metadata = {
  title: "Weather Warnings — Infoplaza Platform Examples",
};

/**
 * The warnings for the default location are loaded here so the page arrives
 * with content; every later lookup is a click away in the panel.
 */
async function initialWarnings(): Promise<{
  warnings: Warning[];
  error: string | null;
}> {
  try {
    return {
      warnings: await weatherWarnings(
        DEFAULT_LOCATION.latitude,
        DEFAULT_LOCATION.longitude,
      ),
      error: null,
    };
  } catch (error) {
    return {
      warnings: [],
      error:
        error instanceof Error ? error.message : "Failed to load warnings.",
    };
  }
}

export default async function WeatherWarningsPage() {
  const { warnings, error } = await initialWarnings();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Weather
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Weather Warnings</h1>
      <p className="mt-2 text-gray-600">
        Pick a spot on the map to see the severe weather warned about there
        with the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-weather-warnings"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Weather Warnings API
        </a>
        . One call answers for one point with the warnings the national
        services have in force for it — heat, thunderstorms, wind, wildfire —
        each with the colour code it was issued under and the text explaining
        what to expect.
      </p>

      <div className="mt-8">
        <WarningsPanel initialWarnings={warnings} initialError={error} />
      </div>
    </div>
  );
}
