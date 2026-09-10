import { AsyncLocalStorage } from "node:async_hooks";
import { redactApiKey, type ApiCall } from "./api-call";
import { guardRequest } from "./route-guard";

export type { ApiCall } from "./api-call";

/**
 * The server side of every example: one way to call the Platform, and one way
 * to hand the result to the browser.
 *
 * Each endpoint takes the API key as a query parameter, so the calls are made
 * here and the browser talks to the route handlers instead. Every call made
 * through this module is recorded, and `apiRoute` sends those recordings along
 * with the answer so the page can show what it asked and what came back.
 *
 * API reference: https://platform.infoplaza.com/reference
 */

/** Envelope every Platform REST endpoint wraps its payload in. */
export interface PlatformResponse<T> {
  success: boolean;
  data?: T;
  meta?: PlatformMeta;
  error?: { message?: string };
}

/** What the Platform says about the call itself, next to the payload. */
export interface PlatformMeta {
  /**
   * What the call cost. Every REST answer carries it, an answer that refused
   * to do the work as a 0, so this is what is charged rather than a guess.
   */
  credits?: number;
}

/** A Platform endpoint: where it lives, what it is called, where it is documented. */
export interface Endpoint {
  /** The endpoint in words, e.g. "Weather Warnings". */
  name: string;
  /** The URL it is called at. */
  url: string;
  /** The endpoint in the Platform reference. */
  docsUrl: string;
}

/**
 * Answers longer than this are cut off before they are sent to the browser.
 * The Port List alone is several megabytes, and the point of showing it is to
 * show its shape, not to ship it twice.
 */
const MAX_RESPONSE_CHARS = 60_000;

export function requireApiKey(): string {
  const apiKey = process.env.INFOPLAZA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "INFOPLAZA_API_KEY is not set. Copy .env.example to .env.local and add your API key.",
    );
  }
  return apiKey;
}

/**
 * The calls made while handling one request.
 *
 * A lookup can fan out, as in the Traffic example asking two endpoints for
 * the same events, and the calls are made several layers below the route
 * handler that has to report them. Async local storage carries the collection down without
 * every function in between having to pass it along.
 */
const recording = new AsyncLocalStorage<ApiCall[]>();

/** Oldest first, which is the order the calls went out in. */
function sortByStart(calls: ApiCall[]): ApiCall[] {
  return [...calls].sort((one, other) => one.startedAt - other.startedAt);
}

/** Adds a call to the recording in progress, if there is one. */
export function recordApiCall(call: ApiCall): void {
  recording.getStore()?.push(call);
}

/**
 * Runs `work` and returns what it produced together with every Platform call
 * it made. Used by the pages that load their opening state while rendering;
 * route handlers get the same thing from `apiRoute`.
 */
export async function collectApiCalls<T>(
  work: () => Promise<T>,
): Promise<{ result: T; apiCalls: ApiCall[] }> {
  const apiCalls: ApiCall[] = [];
  const result = await recording.run(apiCalls, work);
  // Calls are filed as they finish, and a lookup that fans out finishes out
  // of order. The log reads better as the order they went out in.
  return { result, apiCalls: sortByStart(apiCalls) };
}

/**
 * Turns a finished call into the record the browser is shown, with the API key
 * taken out and a long answer cut short.
 */
export function buildApiCall(call: {
  endpoint: Endpoint;
  method: string;
  url: string;
  requestBody?: string;
  status: number;
  durationMs: number;
  /** What the answer said it cost. Null where nothing said. */
  credits: number | null;
  /** When the call went out, as unix milliseconds. */
  startedAt: number;
  /** The answer as it arrived, before any shortening. */
  body: string;
}): ApiCall {
  const truncated = call.body.length > MAX_RESPONSE_CHARS;

  return {
    id: crypto.randomUUID(),
    name: call.endpoint.name,
    docsUrl: call.endpoint.docsUrl,
    method: call.method,
    url: redactApiKey(call.url),
    requestBody: call.requestBody,
    status: call.status,
    durationMs: Math.round(call.durationMs),
    credits: call.credits,
    startedAt: call.startedAt,
    response: truncated ? call.body.slice(0, MAX_RESPONSE_CHARS) : call.body,
    responseBytes: new TextEncoder().encode(call.body).length,
    truncated,
  };
}

/**
 * Calls a Platform endpoint with the API key attached and records the call.
 *
 * The envelope comes back whole, status and all, because endpoints differ in
 * what they call a failure: most answer with `success: false`, a few answer
 * 200 with an `error` string where the payload should be, and the Climate
 * endpoint answers 500 for a point it has no data for. `platformGet` handles
 * the common case; the callers that need to tell those apart use this.
 */
export async function platformRequest<T>(
  endpoint: Endpoint,
  params: Record<string, string>,
): Promise<{ status: number; ok: boolean; body: PlatformResponse<T> | null }> {
  const url = new URL(endpoint.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", requireApiKey());

  const startedAt = Date.now();
  const clockedAt = performance.now();
  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();
  const durationMs = performance.now() - clockedAt;

  let body: PlatformResponse<T> | null = null;
  try {
    body = JSON.parse(text) as PlatformResponse<T>;
  } catch {
    body = null;
  }

  recordApiCall(
    buildApiCall({
      endpoint,
      method: "GET",
      url: url.toString(),
      status: response.status,
      durationMs,
      // Straight from the envelope: the endpoints price a call themselves,
      // and a call they refused is reported as costing nothing.
      credits: body?.meta?.credits ?? null,
      startedAt,
      // Pretty-printed so the panel can show it as it is, and left verbatim
      // when it is not JSON at all — which an error page from a proxy is.
      body: body === null ? text : JSON.stringify(body, null, 2),
    }),
  );

  return { status: response.status, ok: response.ok, body };
}

/**
 * The payload of a Platform endpoint, or an exception. Covers the endpoints
 * that report failure the usual way.
 */
export async function platformGet<T>(
  endpoint: Endpoint,
  params: Record<string, string> = {},
): Promise<T> {
  const { status, ok, body } = await platformRequest<T>(endpoint, params);

  if (!ok || !body?.success || !body.data) {
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${status}.`,
    );
  }
  return body.data;
}

/**
 * An answer a route handler wants to give with a status other than 502, which
 * is what an unexpected failure becomes. Thrown for a request that does not
 * make sense (400) and for the one case a click can legitimately fail: a
 * location the Climate endpoint has no data for (404).
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Extra fields to merge into the error response. */
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Wraps a route handler so it only has to produce its payload.
 *
 * Every route in these examples proxies the Platform the same way, so the
 * parts that never differ live here: the gate in front of the handler, the
 * recording of the calls made, the `apiCalls` those are returned as, an
 * HttpError turned into its own status, and anything else turned into a 502
 * with its message.
 */
export function apiRoute<T extends object>(
  fallbackMessage: string,
  handler: (request: Request) => Promise<T>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    // Before the key is attached to anything: a request that did not come
    // from a page of this app is refused here rather than paid for. This is
    // where a new example gets that for free — see @/lib/route-guard.
    const refused = await guardRequest(request);
    if (refused) return refused;

    const { result, apiCalls } = await collectApiCalls<{
      status: number;
      payload: object;
    }>(async () => {
      try {
        return { status: 200, payload: await handler(request) };
      } catch (error) {
        if (error instanceof HttpError) {
          return {
            status: error.status,
            payload: { error: error.message, ...error.extra },
          };
        }
        return {
          status: 502,
          payload: {
            error: error instanceof Error ? error.message : fallbackMessage,
          },
        };
      }
    });

    // The recordings ride along with both answers: a call that failed is the
    // one most worth looking at.
    return Response.json(
      { ...result.payload, apiCalls: sortByStart(apiCalls) },
      { status: result.status },
    );
  };
}
