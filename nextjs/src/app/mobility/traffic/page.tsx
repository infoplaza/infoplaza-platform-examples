import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { TrafficPanel } from "./components/traffic-panel";

export const metadata: Metadata = {
  title: "Traffic — Infoplaza Platform Examples",
};

/**
 * The page itself only holds the text around the example. The traffic is
 * loaded in the browser by the panel below, through the route handler in
 * events/, so the map and the list are built entirely on the client and the
 * times in them are the visitor's own. Both calls that route makes turn up in
 * the API log at the bottom.
 */
export default function TrafficPage() {
  return (
    <ExamplePage
      group="Mobility"
      title="Traffic"
      intro={
        <>
          Live jams, roadworks and diversions on the Dutch roads. The{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-traffic-geo">
            Traffic Geo API
          </ApiLink>{" "}
          returns them as GeoJSON for the map, the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-traffic-overview">
            Traffic Overview API
          </ApiLink>{" "}
          adds the delay and queue length for the list.
        </>
      }
    >
      <TrafficPanel />
    </ExamplePage>
  );
}
