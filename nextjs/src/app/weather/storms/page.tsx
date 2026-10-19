import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { StormsPanel } from "./components/storms-panel";

export const metadata: Metadata = {
  title: "Tropical Storms — Infoplaza Platform Examples",
};

/**
 * The page itself only holds the text around the example. The storms are
 * loaded in the browser by the panel below, through the route handler in
 * active/, so the map is built on the client only and the times in the tables
 * are the visitor's own. The call that route makes turns up in the API log.
 */
export default function TropicalStormsPage() {
  return (
    <ExamplePage
      group="Weather"
      title="Tropical Storms"
      intro={
        <>
          Every hurricane, typhoon and cyclone active right now, on a globe.
          One call to the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-storms">
            Tropical Storms API
          </ApiLink>{" "}
          returns them all, each with the track it has followed, the cone it
          is forecast to move through and the wind, gusts and pressure of the
          latest advisory.
        </>
      }
    >
      <StormsPanel />
    </ExamplePage>
  );
}
