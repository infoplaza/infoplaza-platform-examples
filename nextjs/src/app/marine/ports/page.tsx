import type { Metadata } from "next";
import { PortsPanel } from "./components/ports-panel";

export const metadata: Metadata = {
  title: "Ports — Infoplaza Platform Examples",
};

/**
 * The page itself only holds the copy: the map needs a browser, and the ports
 * on it are fetched from there too, through the route handlers next to the
 * panel. So nothing here waits on the API, and the HTML stays small no matter
 * how many ports the filter asks for.
 */
export default function PortsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Marine
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Ports</h1>
      <p className="mt-2 text-gray-600">
        Every seaport in the world on a sea chart, with the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-port-list"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Port List
        </a>{" "}
        and{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-port-info"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Port Info
        </a>{" "}
        APIs. The first hands over all 3,700 of them at once, graded by the
        traffic they can take; the second answers for a single port with what
        the World Port Index knows about it — how deep its channel is, what it
        can lift, whether pilotage is compulsory and what a ship can take on
        board there.
      </p>

      <div className="mt-8">
        <PortsPanel />
      </div>
    </div>
  );
}
