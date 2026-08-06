import type { Metadata } from "next";
import { portInfo, portList } from "./api";
import { PortsPanel } from "./components/ports-panel";
import { DEFAULT_PORT_ID, type Port, type PortInfo } from "./utils";

export const metadata: Metadata = {
  title: "Ports — Infoplaza Platform Examples",
};

/**
 * The large ports and one of them in full are loaded here so the page arrives
 * with a map that has something on it and details to read; every later port
 * is a click away in the panel.
 *
 * The two calls do not depend on each other, so they go out together.
 */
async function initialData(): Promise<{
  ports: Port[];
  port: PortInfo | null;
  error: string | null;
}> {
  try {
    const [ports, port] = await Promise.all([
      portList(),
      portInfo(DEFAULT_PORT_ID),
    ]);
    return { ports, port, error: null };
  } catch (error) {
    return {
      ports: [],
      port: null,
      error: error instanceof Error ? error.message : "Failed to load ports.",
    };
  }
}

export default async function PortsPage() {
  const { ports, port, error } = await initialData();

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
        <PortsPanel
          initialPorts={ports}
          initialPort={port}
          initialError={error}
        />
      </div>
    </div>
  );
}
