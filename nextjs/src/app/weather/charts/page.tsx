import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { ChartsPanel } from "./components/charts-panel";

export const metadata: Metadata = {
  title: "Charts — Infoplaza Platform Examples",
};

export default function ChartsPage() {
  return (
    <ExamplePage
      group="Weather"
      title="Charts"
      intro={
        <>
          Reads the weather models at a point as two charts from{" "}
          <ApiLink href="https://github.com/infoplaza/platform-components">
            @infoplaza/platform
          </ApiLink>
          , the component library for the Platform. The first is the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-timeseries-point">
            Weather Timeseries API
          </ApiLink>{" "}
          hour by hour, the second the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-ensemble-point">
            Weather Ensemble API
          </ApiLink>{" "}
          as the spread between the members of one run. Both fetch what they
          need themselves: the models that reach this point, and then the
          forecast for whichever of them is selected.
        </>
      }
    >
      <ChartsPanel />
    </ExamplePage>
  );
}
