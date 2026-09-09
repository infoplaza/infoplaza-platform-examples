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
          Every weather model on one map. The{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-maps-models">
            Weather Maps Models API
          </ApiLink>{" "}
          says which models there are and what each one can show, and that is
          what fills the panel on the map. The{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-maps-layers">
            Weather Maps Layers API
          </ApiLink>{" "}
          sends the picture itself: the element you picked, for every moment on
          the timebar. The map, the layers over it and the panel come
          ready-made from{" "}
          <ApiLink href="https://github.com/infoplaza/platform-components">
            @infoplaza/platform
          </ApiLink>
          , so this example is little more than the three put together.
        </>
      }
    >
      <MapsPanel />
    </ExamplePage>
  );
}
