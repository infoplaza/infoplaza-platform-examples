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
          Pick a spot on the map to see the severe weather warned about there
          with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-warnings">
            Weather Warnings API
          </ApiLink>
          . One call answers for one point with the warnings the national
          services have in force for it — heat, thunderstorms, wind, wildfire —
          each with the colour code it was issued under and the text explaining
          what to expect.
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
