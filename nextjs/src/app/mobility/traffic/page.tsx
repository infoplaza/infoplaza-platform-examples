import type { Metadata } from "next";
import { TrafficPanel } from "./components/traffic-panel";

export const metadata: Metadata = {
  title: "Traffic — Infoplaza Platform Examples",
};

/**
 * The page itself only holds the text around the example. The traffic is
 * loaded in the browser by the panel below, through the route handler in
 * events/, so the map and the list are built entirely on the client and the
 * times in them are the visitor's own.
 */
export default function TrafficPage() {
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
        <TrafficPanel />
      </div>
    </div>
  );
}
