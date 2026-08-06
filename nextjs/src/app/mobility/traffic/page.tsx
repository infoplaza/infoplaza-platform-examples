import type { Metadata } from "next";
import { trafficGeo, trafficOverview } from "./api";
import { TrafficPanel } from "./components/traffic-panel";
import { mergeEvents, type TrafficEvent, type TrafficSummary } from "./utils";

export const metadata: Metadata = {
  title: "Traffic — Infoplaza Platform Examples",
};

/** Traffic changes by the minute, so nothing here is cached. */
export const dynamic = "force-dynamic";

/**
 * Both APIs are called during server rendering, side by side since neither
 * depends on the other, and merged into the single list the page shows.
 */
async function currentTraffic(): Promise<{
  events: TrafficEvent[];
  summary: TrafficSummary | null;
  error: string | null;
}> {
  try {
    const [features, overview] = await Promise.all([
      trafficGeo(),
      trafficOverview(),
    ]);
    return {
      events: mergeEvents(features, overview.events),
      summary: overview.summary,
      error: null,
    };
  } catch (error) {
    return {
      events: [],
      summary: null,
      error:
        error instanceof Error ? error.message : "Failed to load traffic.",
    };
  }
}

export default async function TrafficPage() {
  const { events, summary, error } = await currentTraffic();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Mobility
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Traffic</h1>
      <p className="mt-2 text-gray-600">
        Live jams, roadworks and diversions on the Dutch roads. The{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-traffic-geo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Traffic Geo API
        </a>{" "}
        returns them as GeoJSON for the map, the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-traffic-overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Traffic Overview API
        </a>{" "}
        adds the delay and queue length for the list.
      </p>

      <div className="mt-8">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <TrafficPanel events={events} summary={summary!} />
        )}
      </div>
    </div>
  );
}
