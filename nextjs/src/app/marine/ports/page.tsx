import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { PortsPanel } from "./components/ports-panel";

export const metadata: Metadata = {
  title: "Ports — Infoplaza Platform Examples",
};

/**
 * The page itself only holds the copy: the map needs a browser, and the ports
 * on it are fetched from there too, through the route handlers next to the
 * panel. So nothing here waits on the API, and the HTML stays small no matter
 * how many ports the filter asks for — and the API log starts empty, because
 * every call this example makes is made from the browser.
 */
export default function PortsPage() {
  return (
    <ExamplePage
      group="Marine"
      title="Ports"
      intro={
        <>
          Every seaport in the world on a sea chart, with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-port-list">
            Port List
          </ApiLink>{" "}
          and{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-port-info">
            Port Info
          </ApiLink>{" "}
          APIs. The first hands over all 3,700 of them at once, graded by the
          traffic they can take; the second answers for a single port with what
          the World Port Index knows about it — how deep its channel is, what
          it can lift, whether pilotage is compulsory and what a ship can take
          on board there.
        </>
      }
    >
      <PortsPanel />
    </ExamplePage>
  );
}
