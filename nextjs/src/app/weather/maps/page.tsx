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
          Two Platform APIs draw this map. The{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-maps-models">
            Weather Maps Models API
          </ApiLink>{" "}
          is the catalog behind the panel on it: every model, what each one can
          be asked for, and the runs it has. The{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-maps-layers">
            Weather Maps Layers API
          </ApiLink>{" "}
          is then one call per element in frame, answering with an image of it
          for every moment on the timebar, and those images are what is drawn
          over the basemap. Both go through this app, so both are in the log
          beside the map. The drawing is not written here:{" "}
          <ApiLink href="https://github.com/infoplaza/platform-components">
            @infoplaza/platform
          </ApiLink>{" "}
          ships the map, the layers over it and the panel that changes them as
          components, so what this example writes is the composition and the
          route they fetch through.
        </>
      }
    >
      <MapsPanel />
    </ExamplePage>
  );
}
