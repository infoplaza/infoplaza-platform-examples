import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { TransitPlannerPanel } from "./components/transit-planner-panel";

export const metadata: Metadata = {
  title: "Transit Planner — Infoplaza Platform Examples",
};

export default function TransitPlannerPage() {
  return (
    <ExamplePage
      group="Mobility"
      title="Transit Planner"
      intro={
        <>
          Stream travel results between two locations in real time using the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-transit-implanner">
            Transit I'm Planner API
          </ApiLink>
          . The From and To fields look up stations, stops and addresses with
          the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-transit-planner-search">
            Transit Planner Search API
          </ApiLink>
          . The Mixer is a WebSocket rather than a request and a response, so
          the API log below shows the whole exchange at once: the PlanRequest
          that went out, and every result that came back before the socket
          closed.
        </>
      }
    >
      <TransitPlannerPanel />
    </ExamplePage>
  );
}
