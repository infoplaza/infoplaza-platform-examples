import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { openPlannerMixer } from "../api";

/**
 * WebSocket proxy between the browser and the Planner Mixer.
 *
 * The browser opens a socket to this path and sends one JSON message with the
 * plan request. The proxy opens the upstream socket to api.infoplaza.com with
 * the API key from INFOPLAZA_API_KEY, forwards each decoded PlanResult to the
 * browser as JSON and closes when the mixer is done. This keeps the API key
 * out of client-side code.
 *
 * WebSocket upgrades are not supported by Next.js route handlers, so this
 * handler is wired up in the custom server (see server.ts in the project
 * root).
 */

export const PLANNER_MIXER_PROXY_PATH = "/mobility/planner-mixer/proxy";

const COORDINATE_PAIR = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

const server = new WebSocketServer({ noServer: true });

export function handlePlannerMixerUpgrade(
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
) {
  server.handleUpgrade(request, socket, head, handleConnection);
}

function handleConnection(client: WebSocket) {
  client.once("message", (data) => {
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(data.toString());
    } catch {
      // fall through to validation below
    }
    const { fromPlace, toPlace, arriveBy } = body;

    if (
      typeof fromPlace !== "string" ||
      typeof toPlace !== "string" ||
      !COORDINATE_PAIR.test(fromPlace) ||
      !COORDINATE_PAIR.test(toPlace)
    ) {
      client.send(
        JSON.stringify({
          error: 'fromPlace and toPlace must be "latitude,longitude" strings.',
        }),
      );
      client.close(1008, "Invalid plan request");
      return;
    }

    try {
      const upstream = openPlannerMixer(
        { fromPlace, toPlace, arriveBy: arriveBy === true },
        {
          onResult: (result) => client.send(JSON.stringify(result)),
          onClose: () => client.close(1000),
          onError: (error) => {
            client.send(JSON.stringify({ error: error.message }));
            client.close(1011, "Planner Mixer error");
          },
        },
      );
      client.on("close", () => upstream.close());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to plan trip.";
      client.send(JSON.stringify({ error: message }));
      client.close(1011, "Planner Mixer unavailable");
    }
  });
}
