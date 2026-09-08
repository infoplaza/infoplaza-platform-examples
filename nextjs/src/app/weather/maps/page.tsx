import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { MapsPanel } from "./components/maps-panel";

export const metadata: Metadata = {
  title: "Maps — Infoplaza Platform Examples",
};

export default function MapsPage() {
  return (
    <ExamplePage
      group="Weather"
      title="Maps"
      intro={
        <>
          Draws the weather models on a map with{" "}
          <ApiLink href="https://github.com/infoplaza/platform-components">
            @infoplaza/platform
          </ApiLink>
          , the component library for the Platform. The map, the layers over
          it and the panel that changes them all come from the package: what
          this example writes is the composition, a basemap picker and the
          route the components fetch through. Every other example here draws
          its own map from the answers it gets, and this is the one that does
          not have to.
        </>
      }
    >
      <MapsPanel />
    </ExamplePage>
  );
}
