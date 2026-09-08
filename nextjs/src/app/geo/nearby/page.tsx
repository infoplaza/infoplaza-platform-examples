import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { collectApiCalls } from "@/lib/platform";
import { nearbyPlace } from "./api";
import { GeoNearbyPanel } from "./components/geo-nearby-panel";
import {
  DEFAULT_LOCATION,
  DEFAULT_RADIUS,
  formatRadius,
  type Place,
} from "./utils";

export const metadata: Metadata = {
  title: "Geo Nearby — Infoplaza Platform Examples",
};

/**
 * The place around the default location is loaded here so the page arrives
 * with content; every later lookup is a click or a radius away in the panel.
 */
async function initialPlace(): Promise<{
  place: Place | null;
  error: string | null;
}> {
  try {
    return {
      place: await nearbyPlace(
        DEFAULT_LOCATION.latitude,
        DEFAULT_LOCATION.longitude,
        DEFAULT_RADIUS,
      ),
      error: null,
    };
  } catch (error) {
    return {
      place: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load the nearby place.",
    };
  }
}

export default async function GeoNearbyPage() {
  // The call made while rendering is recorded like the ones the panel makes
  // later, so the API log opens with the request behind what is on screen.
  const { result, apiCalls } = await collectApiCalls(initialPlace);

  return (
    <ExamplePage
      group="Geo"
      title="Geo Nearby"
      apiCalls={apiCalls}
      intro={
        <>
          Pick a spot on the map to find the place around it with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-geo-nearby">
            Geo Nearby API
          </ApiLink>
          . One call answers with one place: the most prominent one within the
          radius asked for, so widening the radius does not add places, it
          swaps the answer for a bigger one. The circle on the map is the{" "}
          {formatRadius(DEFAULT_RADIUS)} the page opens on; every lookup, at
          any radius, is a single request.
        </>
      }
    >
      <GeoNearbyPanel
        initialPlace={result.place}
        initialError={result.error}
      />
    </ExamplePage>
  );
}
