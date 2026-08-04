import protobuf from "protobufjs";
import protoJson from "./proto/proto.json";

/**
 * Server-side client for the Transit Planner Mixer API.
 *
 * The Planner Mixer is a WebSocket endpoint that streams protobuf-encoded
 * PlanResult messages: it keeps sending better travel options until the mixer
 * is done and closes the socket. This module opens that socket on the server
 * (so the API key never reaches the browser), decodes each message and hands
 * the results to the caller as plain JSON objects.
 *
 * API reference: https://platform.infoplaza.com/reference/v1-transit-plannermixer
 */

const PLANNER_MIXER_URL = "wss://api.infoplaza.com/v1/transit/plannermixer";

/** How long to wait for results before closing the socket ourselves. */
const SOCKET_TIMEOUT_MS = 30_000;

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
  const apiKey = process.env.INFOPLAZA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "INFOPLAZA_API_KEY is not set. Copy .env.example to .env.local and add your API key.",
    );
  }

  const socket = new WebSocket(`${PLANNER_MIXER_URL}?api_key=${apiKey}`);
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
