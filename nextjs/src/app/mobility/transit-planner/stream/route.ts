import { openTransitPlanner } from "../api";
import { COORDINATE_PAIR } from "../utils";

/**
 * Streaming proxy between the browser and the Transit Planner.
 *
 * The browser opens an EventSource on this route with the plan request in the
 * query string. The route opens the upstream WebSocket to api.infoplaza.com
 * with the API key from INFOPLAZA_API_KEY and forwards each decoded PlanResult
 * as a server-sent event until the mixer is done. This keeps the API key out
 * of client-side code.
 *
 * Server-sent events rather than a WebSocket between browser and server,
 * because a route handler cannot upgrade to a WebSocket: that would need a
 * custom Node.js server, which serverless hosts do not run. Only the browser
 * leg changes — the upstream connection is still the WebSocket the Planner
 * Mixer speaks.
 */

/** The stream stays open while the mixer works; never prerender this route. */
export const dynamic = "force-dynamic";

/** Comfortably above the 30s upstream timeout in api.ts. */
export const maxDuration = 60;

function event(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const fromPlace = params.get("fromPlace") ?? "";
  const toPlace = params.get("toPlace") ?? "";
  const arriveBy = params.get("arriveBy") === "true";

  if (!COORDINATE_PAIR.test(fromPlace) || !COORDINATE_PAIR.test(toPlace)) {
    return Response.json(
      { error: 'fromPlace and toPlace must be "latitude,longitude" strings.' },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      const send = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };

      let upstream: { close(): void };
      try {
        upstream = openTransitPlanner(
          { fromPlace, toPlace, arriveBy },
          {
            // Results go out as default `message` events. The error event is
            // deliberately not called "error": EventSource delivers a
            // server-sent "error" event to the same listener as connection
            // failures, which makes the two impossible to tell apart.
            onResult: (result) => send(`data: ${JSON.stringify(result)}\n\n`),
            onClose: () => {
              send(event("done", {}));
              close();
            },
            onError: (error) => {
              send(event("planner-error", { message: error.message }));
              close();
            },
          },
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to plan trip.";
        send(event("planner-error", { message }));
        close();
        return;
      }

      // Someone navigated away or closed the tab: drop the upstream socket
      // instead of letting it run to its timeout.
      request.signal.addEventListener("abort", () => {
        upstream.close();
        close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      // no-transform keeps proxies from buffering the stream, which would
      // hold everything back until the mixer is done.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
