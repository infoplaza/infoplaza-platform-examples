import type { Metadata } from "next";
import { PlannerMixerPanel } from "./components/planner-mixer-panel";

export const metadata: Metadata = {
  title: "Planner Mixer — Infoplaza Platform Examples",
};

export default function PlannerMixerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Mobility
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Planner Mixer</h1>
      <p className="mt-2 text-gray-600">
        Stream travel results between two coordinates in real time using the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-transit-plannermixer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Transit Planner Mixer API
        </a>
        . The browser connects to a WebSocket proxy on this app&apos;s own
        server, which opens the upstream socket to the API — so the API key
        never leaves the server.
      </p>

      <div className="mt-8">
        <PlannerMixerPanel />
      </div>
    </div>
  );
}
