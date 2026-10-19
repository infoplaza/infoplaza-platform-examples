import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { collectApiCalls } from "@/lib/platform";
import { observationSources, observationsAtStation } from "./api";
import {
  ObservationsPanel,
  type Selection,
} from "./components/observations-panel";
import {
  DEFAULT_SOURCE,
  DEFAULT_STATION_ID,
  type ObservationSource,
} from "./utils";

export const metadata: Metadata = {
  title: "Observations — Infoplaza Platform Examples",
};

/**
 * The networks and the latest readings at De Bilt are loaded here, so the
 * page arrives with content: one credit each. The stations of the network are
 * not: a network's list runs to thousands of stations over several pages, so
 * the panel asks for them once it is on screen. Everything after that is a
 * click away in the panel.
 */
async function initialState(): Promise<{
  sources: ObservationSource[];
  selection: Selection | null;
  error: string | null;
}> {
  // Settled rather than all-or-nothing: without the station's readings the
  // select and the map are still worth showing.
  const [sources, station] = await Promise.allSettled([
    observationSources(),
    observationsAtStation(DEFAULT_SOURCE, DEFAULT_STATION_ID),
  ]);

  const failure = [sources, station].find(
    (outcome): outcome is PromiseRejectedResult =>
      outcome.status === "rejected",
  );

  return {
    sources: sources.status === "fulfilled" ? sources.value : [],
    selection:
      station.status === "fulfilled" && station.value.station
        ? {
            station: station.value.station,
            observation: station.value.observations[0] ?? null,
            via: "station",
          }
        : null,
    error: failure
      ? failure.reason instanceof Error
        ? failure.reason.message
        : "Failed to load observations."
      : null,
  };
}

export default async function ObservationsPage() {
  // The calls made while rendering are recorded like the ones the panel makes
  // later, so the API log opens with the requests behind what is on screen.
  const { result, apiCalls } = await collectApiCalls(initialState);

  return (
    <ExamplePage
      group="Weather"
      title="Observations"
      apiCalls={apiCalls}
      intro={
        <>
          What weather stations, buoys, aircraft and balloons measured, with
          the five Observations APIs. The{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-observations-sources">
            Sources
          </ApiLink>{" "}
          endpoint lists the networks and the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-observations-stations">
            Stations
          </ApiLink>{" "}
          endpoint puts one on the map. A station is read by id with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-observations-station">
            Station
          </ApiLink>{" "}
          endpoint, the one nearest to a spot with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-observations-point">
            Point
          </ApiLink>{" "}
          endpoint, and every station in a box at once with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-observations-area">
            Area
          </ApiLink>{" "}
          endpoint.
        </>
      }
    >
      {result.sources.length === 0 ? (
        <p className="text-sm text-red-600">
          {result.error ?? "No observation sources are available."}
        </p>
      ) : (
        <ObservationsPanel
          sources={result.sources}
          initialSourceId={DEFAULT_SOURCE}
          initialSelection={result.selection}
          initialError={result.error}
        />
      )}
    </ExamplePage>
  );
}
