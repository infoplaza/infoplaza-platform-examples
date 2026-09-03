import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { collectApiCalls } from "@/lib/platform";
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
  // The call made while rendering is recorded like the ones the panel makes
  // later, so the API log opens with the request behind what is on screen.
  const { result, apiCalls } = await collectApiCalls(initialStops);

  return (
    <ExamplePage
      group="Mobility"
      title="Transit Stops"
      apiCalls={apiCalls}
      intro={
        <>
          Pick a spot on the map to find the transit stops around it with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-transit-stop-nearby">
            Transit Stop Nearby API
          </ApiLink>
          , then pick a stop to see the next hour of departures from the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-transit-stop-departures">
            Transit Stop Departures API
          </ApiLink>
          .
        </>
      }
    >
      <TransitStopsPanel
        initialStops={result.stops}
        initialError={result.error}
      />
    </ExamplePage>
  );
}
