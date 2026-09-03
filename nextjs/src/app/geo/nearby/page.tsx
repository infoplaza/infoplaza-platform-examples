import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { collectApiCalls } from "@/lib/platform";
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
  // The calls made while rendering are recorded like the ones the panel makes
  // later, so the API log opens with the requests behind what is on screen —
  // one per radius, which is what makes this example worth watching.
  const { result, apiCalls } = await collectApiCalls(initialPlaces);

  return (
    <ExamplePage
      group="Geo"
      title="Geo Nearby"
      apiCalls={apiCalls}
      intro={
        <>
          Pick a spot on the map to find the places around it with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-geo-nearby">
            Geo Nearby API
          </ApiLink>
          . One call answers with one place, the most prominent one within the
          radius asked for, so this example asks {SEARCH_RADII.length} times —
          from {formatRadius(SEARCH_RADII[0])} out to {formatRadius(MAX_RADIUS)}{" "}
          — and collects the distinct answers into the list below.
        </>
      }
    >
      <GeoNearbyPanel
        initialPlaces={result.places}
        initialError={result.error}
      />
    </ExamplePage>
  );
}
