import { AsyncLocalStorage } from "node:async_hooks";
import PlatformAuth from "@infoplaza/platform/auth";
import { buildApiCall, requireApiKey } from "@/lib/platform";
import {
  PLATFORM_BASE_PATH,
  proxiedEndpoint,
  recordProxiedCall,
  WEATHER_MAPS_BASE_URL,
} from "@/lib/platform-proxy";

/**
 * The Platform, as the component library asks for it.
 *
 * `PlatformAuth` is the package's own route handler. It is mounted once on
 * this catch-all and serves every endpoint the components know: the models
 * behind the map layers, the timeseries catalog and point forecast behind the
 * table, and the ensemble pair behind the graph. Each one is forwarded to the
 * Platform with the API key from INFOPLAZA_API_KEY attached, so the browser
 * only ever talks to /api/platform and the key stays here.
 *
 * Mounting it is not optional: without this route the components have no
 * models to draw and no rows to chart.
 *
 * Every call it forwards is also recorded for the API log on the page. The
 * package makes that call itself, deep inside its own code, so it is watched
 * rather than made here: `fetch` is wrapped for the duration of the request,
 * which is what gives the log the URL that actually went out, the answer as
 * the Platform gave it and, in that answer, what the call cost. By the time
 * the package is done with it the envelope carrying the cost has been unpacked
 * and thrown away, so watching is the only place it can still be read.
 */

/**
 * Built on the first request rather than at import, because `PlatformAuth`
 * throws without a key and a module that throws while it is being loaded
 * would take the whole app down at build time instead of failing the one
 * request that needed the key.
 */
let handler: ((request: Request) => Promise<Response>) | null = null;

function platformHandler(): (request: Request) => Promise<Response> {
  handler ??= PlatformAuth({
    apiKey: requireApiKey(),
    baseUrl: WEATHER_MAPS_BASE_URL,
    basePath: PLATFORM_BASE_PATH,
    // The Platform takes the key as `api_key` on every endpoint it documents,
    // which is what the rest of these examples send as well. The package
    // defaults to `token` for the maps endpoints and overrides itself to
    // `api_key` for the timeseries and ensemble ones.
    apiKeyQueryParam: "api_key",
  });
  return handler;
}

/** One call the package made while it was handling a request. */
interface UpstreamCall {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  /** When it went out, as unix milliseconds. */
  startedAt: number;
  /** The answer as it arrived, envelope and all. */
  body: string;
}

/**
 * The calls made while handling one request.
 *
 * Async local storage is what keeps the wrapper below out of the way of the
 * rest of the app: a fetch outside this route finds no collection to file
 * into and is passed straight through. It is the same trick @/lib/platform
 * uses to follow the calls a route handler makes below itself.
 */
const watching = new AsyncLocalStorage<UpstreamCall[]>();

/** Marks the wrapper, so a module reloaded in development cannot stack them. */
const WRAPPED = Symbol.for("infoplaza-examples.watched-fetch");

function watchFetch(): void {
  const current = globalThis.fetch as typeof fetch & { [WRAPPED]?: true };
  if (current[WRAPPED]) return;

  const watched = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const calls = watching.getStore();
    if (!calls) return current(input, init);

    const startedAt = Date.now();
    const clockedAt = performance.now();
    const response = await current(input, init);
    const durationMs = performance.now() - clockedAt;

    calls.push({
      method:
        init?.method ?? (input instanceof Request ? input.method : "GET"),
      url: input instanceof Request ? input.url : String(input),
      status: response.status,
      durationMs,
      startedAt,
      // Cloned before anyone reads it, because a body can only be read once
      // and the package is about to read this one.
      body: await response.clone().text(),
    });

    return response;
  };

  Object.defineProperty(watched, WRAPPED, { value: true });
  globalThis.fetch = watched as typeof fetch;
}

/** Pretty-printed when it is JSON, and left as it is when it is not. */
function formatBody(body: string): {
  text: string;
  credits: number | null;
} {
  try {
    const parsed = JSON.parse(body) as { meta?: { credits?: number } };
    return {
      text: JSON.stringify(parsed, null, 2),
      // Straight from the envelope, as everywhere else: the endpoints price a
      // call themselves, and a call they refused is reported as costing
      // nothing.
      credits: parsed?.meta?.credits ?? null,
    };
  } catch {
    return { text: body, credits: null };
  }
}

async function proxy(request: Request): Promise<Response> {
  watchFetch();

  const segment = new URL(request.url)
    .pathname.slice(PLATFORM_BASE_PATH.length + 1)
    .split("/")[0];
  const endpoint = proxiedEndpoint(segment);

  const calls: UpstreamCall[] = [];
  let response: Response;
  try {
    response = await watching.run(calls, () => platformHandler()(request));
  } catch (error) {
    // A missing key lands here, as does anything the package throws on.
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The Platform request failed.",
      },
      { status: 502 },
    );
  }

  // A request the package answered itself, a 404 for an endpoint it does not
  // have, never reached the Platform and has nothing to report.
  if (endpoint) {
    for (const call of calls) {
      const { text, credits } = formatBody(call.body);
      recordProxiedCall(
        buildApiCall({
          endpoint: { ...endpoint, url: call.url },
          method: call.method,
          url: call.url,
          status: call.status,
          durationMs: call.durationMs,
          credits,
          startedAt: call.startedAt,
          body: text,
        }),
      );
    }
  }

  return response;
}

export { proxy as GET, proxy as POST };
