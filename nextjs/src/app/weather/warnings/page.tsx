import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { collectApiCalls } from "@/lib/platform";
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
  // The call made while rendering is recorded like the ones the panel makes
  // later, so the API log opens with the request behind what is on screen.
  const { result, apiCalls } = await collectApiCalls(initialWarnings);

  return (
    <ExamplePage
      group="Weather"
      title="Weather Warnings"
      apiCalls={apiCalls}
      intro={
        <>
          See where in Europe severe weather is warned about with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-warnings-geo">
            Weather Warnings Geo API
          </ApiLink>
          , then pick a spot on the map to read the warnings there with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-warnings">
            Weather Warnings API
          </ApiLink>
          . The first answers for the whole continent with the region each
          warning covers; the second for one point, with the warnings the
          national services have in force for it — heat, thunderstorms, wind,
          wildfire — each with the colour code it was issued under and the text
          explaining what to expect.
        </>
      }
    >
      <WarningsPanel
        initialWarnings={result.warnings}
        initialError={result.error}
      />
    </ExamplePage>
  );
}
