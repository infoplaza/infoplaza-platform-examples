import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { collectApiCalls } from "@/lib/platform";
import { climateNormals } from "./api";
import { ClimatePanel } from "./components/climate-panel";
import { DEFAULT_GRANULARITY, DEFAULT_LOCATION, type Climate } from "./utils";

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
        error instanceof Error ? error.message : "Failed to load climate data.",
    };
  }
}

export default async function ClimatePage() {
  // The call made while rendering is recorded like the ones the panel makes
  // later, so the API log opens with the request behind what is on screen.
  const { result, apiCalls } = await collectApiCalls(initialClimate);

  return (
    <ExamplePage
      group="Weather"
      title="Climate"
      apiCalls={apiCalls}
      intro={
        <>
          Pick a location on the map to see what its year normally looks like,
          with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-climate">
            Weather Climate API
          </ApiLink>
          . One call returns the whole year at that point: the average daily
          low and high, the rain, the sunshine and the wind for every month,
          half month or ten-day period. These are long-term averages, not a
          forecast, so they answer what an ordinary January looks like there
          rather than what next January will bring.
        </>
      }
    >
      <ClimatePanel
        initialClimate={result.climate}
        initialError={result.error}
      />
    </ExamplePage>
  );
}
