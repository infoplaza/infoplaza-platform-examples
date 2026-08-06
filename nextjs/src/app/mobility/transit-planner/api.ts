import protobuf from "protobufjs";
import protoJson from "./proto/proto.json";
import type { PlaceSuggestion } from "./utils";

/**
 * Server-side clients for the two Transit APIs this example uses.
 *
 * The Planner Mixer is a WebSocket endpoint that streams protobuf-encoded
 * PlanResult messages: it keeps sending better travel options until the mixer
 * is done and closes the socket. This module opens that socket on the server
 * (so the API key never reaches the browser), decodes each message and hands
 * the results to the caller as plain JSON objects.
 *
 * The Planner Search is a plain REST endpoint that turns a search term into
 * transit locations with coordinates, which is how the From and To fields on
 * the page are filled in.
 *
 * API reference: https://platform.infoplaza.com/reference/v1-transit-plannermixer
 * API reference: https://platform.infoplaza.com/reference/v1-transit-planner-search
 */

const PLANNER_MIXER_URL = "wss://api.infoplaza.com/v1/transit/plannermixer";
const PLANNER_SEARCH_URL =
  "https://api.infoplaza.com/v1/transit/planner/search";

/** How long to wait for results before closing the socket ourselves. */
const SOCKET_TIMEOUT_MS = 30_000;

function requireApiKey(): string {
  const apiKey = process.env.INFOPLAZA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "INFOPLAZA_API_KEY is not set. Copy .env.example to .env.local and add your API key.",
    );
  }
  return apiKey;
}

const root = protobuf.Root.fromJSON(protoJson as protobuf.INamespace);
const PlanRequest = root.lookupType("planner.PlanRequest");
const PlanResult = root.lookupType("planner.model.PlanResult");

export interface PlannerMixerRequest {
  /** Origin as "latitude,longitude". */
  fromPlace: string;
  /** Destination as "latitude,longitude". */
  toPlace: string;
  /** If true, plan to arrive at the given time instead of departing then. */
  arriveBy?: boolean;
  /** Departure/arrival time in ISO 8601. Defaults to now. */
  timestamp?: string;
}

export interface PlannerMixerHandlers {
  /** Called for every PlanResult the mixer sends. */
  onResult(result: Record<string, unknown>): void;
  /** Called once when the mixer is done and closes the socket. */
  onClose(): void;
  /** Called instead of onClose when the connection fails. */
  onError(error: Error): void;
}

/**
 * Opens a WebSocket to the Planner Mixer and sends one PlanRequest. Decoded
 * results are delivered through the handlers until the mixer closes the
 * socket. Returns a handle to close the connection early.
 */
export function openPlannerMixer(
  request: PlannerMixerRequest,
  handlers: PlannerMixerHandlers,
): { close(): void } {
  const socket = new WebSocket(
    `${PLANNER_MIXER_URL}?api_key=${requireApiKey()}`,
  );
  socket.binaryType = "arraybuffer";
  const timeout = setTimeout(() => socket.close(), SOCKET_TIMEOUT_MS);

  let settled = false;
  const settle = (error?: Error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
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
    socket.send(PlanRequest.encode(message).finish());
  };

  socket.onmessage = (event) => {
    const result = PlanResult.decode(new Uint8Array(event.data as ArrayBuffer));
    handlers.onResult(PlanResult.toObject(result, { enums: String }));
  };

  socket.onerror = () => settle(new Error("Planner Mixer socket error"));
  socket.onclose = () => settle();

  return {
    close() {
      clearTimeout(timeout);
      socket.close();
    },
  };
}

/** Envelope every Platform REST endpoint wraps its payload in. */
interface PlatformResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
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
  const url = new URL(PLANNER_SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("api_key", requireApiKey());

  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as PlatformResponse<{
    items?: PlaceSuggestion[];
  }> | null;

  if (!response.ok || !body?.success) {
    throw new Error(
      body?.error?.message ??
        `Planner Search returned HTTP ${response.status}.`,
    );
  }
  return body.data?.items ?? [];
}
