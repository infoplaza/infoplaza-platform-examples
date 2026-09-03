import protobuf from "protobufjs";
import {
  buildApiCall,
  platformRequest,
  requireApiKey,
  type ApiCall,
  type Endpoint,
} from "@/lib/platform";
import protoJson from "./proto/proto.json";
import type { PlaceSuggestion } from "./utils";

/**
 * Server-side clients for the two Transit APIs this example uses.
 *
 * The Transit Planner is a WebSocket endpoint that streams protobuf-encoded
 * PlanResult messages: it keeps sending better travel options until the mixer
 * is done and closes the socket. This module opens that socket on the server
 * (so the API key never reaches the browser), decodes each message and hands
 * the results to the caller as plain JSON objects.
 *
 * The Planner Search is a plain REST endpoint that turns a search term into
 * transit locations with coordinates, which is how the From and To fields on
 * the page are filled in.
 *
 * Both are recorded for the API log on the page: the search through
 * @/lib/platform like every other REST call, the socket by hand, because
 * there is no request and response to record until the mixer is done.
 *
 * API reference: https://platform.infoplaza.com/reference/v1-transit-plannermixer
 * API reference: https://platform.infoplaza.com/reference/v1-transit-planner-search
 */

const TRANSIT_PLANNER: Endpoint = {
  name: "Transit Planner Mixer",
  url: "wss://api.infoplaza.com/v1/transit/plannermixer",
  docsUrl:
    "https://platform.infoplaza.com/reference/v1-transit-plannermixer",
};

const PLANNER_SEARCH: Endpoint = {
  name: "Transit Planner Search",
  url: "https://api.infoplaza.com/v1/transit/planner/search",
  docsUrl:
    "https://platform.infoplaza.com/reference/v1-transit-planner-search",
};

/** How long to wait for results before closing the socket ourselves. */
const SOCKET_TIMEOUT_MS = 30_000;

const root = protobuf.Root.fromJSON(protoJson as protobuf.INamespace);
const PlanRequest = root.lookupType("planner.PlanRequest");
const PlanResult = root.lookupType("planner.model.PlanResult");

export interface TransitPlannerRequest {
  /** Origin as "latitude,longitude". */
  fromPlace: string;
  /** Destination as "latitude,longitude". */
  toPlace: string;
  /** If true, plan to arrive at the given time instead of departing then. */
  arriveBy?: boolean;
  /** Departure/arrival time in ISO 8601. Defaults to now. */
  timestamp?: string;
}

export interface TransitPlannerHandlers {
  /** Called for every PlanResult the mixer sends. */
  onResult(result: Record<string, unknown>): void;
  /** Called once when the mixer is done and closes the socket. */
  onClose(): void;
  /** Called instead of onClose when the connection fails. */
  onError(error: Error): void;
  /**
   * Called once the socket is finished, with the whole exchange as one record
   * for the API log: the request that was sent and every result that came
   * back. A socket has no single answer to record while it is open, so this
   * arrives last, just before onClose or onError.
   */
  onApiCall(call: ApiCall): void;
}

/**
 * Opens a WebSocket to the Transit Planner and sends one PlanRequest. Decoded
 * results are delivered through the handlers until the mixer closes the
 * socket. Returns a handle to close the connection early.
 */
export function openTransitPlanner(
  request: TransitPlannerRequest,
  handlers: TransitPlannerHandlers,
): { close(): void } {
  const url = `${TRANSIT_PLANNER.url}?api_key=${requireApiKey()}`;
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  const timeout = setTimeout(() => socket.close(), SOCKET_TIMEOUT_MS);

  // What the exchange is reported as once it is over: the PlanRequest that
  // was encoded, and the results that came back decoded.
  const startedAt = Date.now();
  const clockedAt = performance.now();
  let sent = "";
  const received: Record<string, unknown>[] = [];

  let settled = false;
  const settle = (error?: Error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);

    handlers.onApiCall(
      buildApiCall({
        endpoint: TRANSIT_PLANNER,
        method: "WS",
        url,
        requestBody: sent,
        // A socket that opened and did its work has no status of its own;
        // 101 is the handshake that got it there.
        status: error ? 502 : 101,
        durationMs: performance.now() - clockedAt,
        startedAt,
        body: error
          ? error.message
          : JSON.stringify(
              { messages: received.length, results: received },
              null,
              2,
            ),
      }),
    );

    if (error) handlers.onError(error);
    else handlers.onClose();
  };

  socket.onopen = () => {
    const message = PlanRequest.create({
      fromPlace: request.fromPlace,
      toPlace: request.toPlace,
      timestamp: request.timestamp ?? new Date().toISOString(),
      arriveBy: request.arriveBy,
    });
    // Recorded as JSON rather than as the protobuf bytes actually sent: the
    // bytes say nothing to read, and these are the fields they encode.
    sent = JSON.stringify(PlanRequest.toObject(message), null, 2);
    socket.send(PlanRequest.encode(message).finish());
  };

  socket.onmessage = (event) => {
    const result = PlanResult.decode(new Uint8Array(event.data as ArrayBuffer));
    const decoded = PlanResult.toObject(result, { enums: String });
    received.push(decoded);
    handlers.onResult(decoded);
  };

  socket.onerror = () => settle(new Error("Transit Planner socket error"));
  socket.onclose = () => settle();

  return {
    close() {
      clearTimeout(timeout);
      socket.close();
    },
  };
}

/**
 * Looks up transit locations (stations, stops, addresses) matching a search
 * term. Used to turn what someone types into the coordinates the Planner
 * Mixer expects.
 */
export async function searchPlaces(
  query: string,
  limit = 8,
): Promise<PlaceSuggestion[]> {
  const { status, ok, body } = await platformRequest<{
    items?: PlaceSuggestion[];
  }>(PLANNER_SEARCH, { query, limit: String(limit) });

  if (!ok || !body?.success) {
    throw new Error(
      body?.error?.message ?? `Planner Search returned HTTP ${status}.`,
    );
  }
  return body.data?.items ?? [];
}
