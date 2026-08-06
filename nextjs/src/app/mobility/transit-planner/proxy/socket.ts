import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { openTransitPlanner } from "../api";
import { COORDINATE_PAIR } from "../utils";

/**
 * WebSocket proxy between the browser and the Transit Planner.
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

export const TRANSIT_PLANNER_PROXY_PATH = "/mobility/transit-planner/proxy";

const server = new WebSocketServer({ noServer: true });

export function handleTransitPlannerUpgrade(
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
      const upstream = openTransitPlanner(
        { fromPlace, toPlace, arriveBy: arriveBy === true },
        {
          onResult: (result) => client.send(JSON.stringify(result)),
          onClose: () => client.close(1000),
          onError: (error) => {
            client.send(JSON.stringify({ error: error.message }));
            client.close(1011, "Transit Planner error");
          },
        },
      );
      client.on("close", () => upstream.close());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to plan trip.";
      client.send(JSON.stringify({ error: message }));
      client.close(1011, "Transit Planner unavailable");
    }
  });
}
