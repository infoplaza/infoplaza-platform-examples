import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { collectApiCalls } from "@/lib/platform";
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
  // The call made while rendering is recorded like the ones the panel makes
  // later, so the API log opens with the request behind what is on screen.
  const { result, apiCalls } = await collectApiCalls(initialResults);

  return (
    <ExamplePage
      group="Geo"
      title="Geo Search"
      apiCalls={apiCalls}
      intro={
        <>
          Look up a place by name with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-geo-search">
            Geo Search API
          </ApiLink>{" "}
          and see every match as a list and on the map, with the coordinates,
          country and timezone the API returns for each one. Those coordinates
          are what the rest of the Platform APIs take as input.
        </>
      }
    >
      <GeoSearchPanel
        initialPlaces={result.places}
        initialError={result.error}
      />
    </ExamplePage>
  );
}
