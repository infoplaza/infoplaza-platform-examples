import {
  FRONTEND_TOKEN_COOKIE,
  frontendTokenIsRequired,
  frontendTokenIsValid,
} from "./frontend-token";

/**
 * The gate in front of every route handler that can reach the Platform.
 *
 * The handlers are what attach the API key, so their URLs are the thing worth
 * taking: /geo/nearby/place?lat=52.02&lon=5.16&radius=10000 answers with real
 * data and costs the deployment real credits, and it carries no key for anyone
 * to have to steal. Three checks stand in front of it, each stopping something
 * the others cannot:
 *
 * 1. **The request came from this origin.** A browser sets `Sec-Fetch-Site`
 *    itself and refuses to let a page override it, so a site of someone
 *    else's cannot make a visitor's browser call these routes and read the
 *    answer. This is the one check that holds completely, and it holds against
 *    the case worth holding against: another party wiring these URLs into
 *    their own front end.
 * 2. **The request carries a token this app minted.** See ./frontend-token:
 *    the URL on its own stops working, so a caller has to load a page, keep
 *    the cookie and come back before it expires.
 * 3. **The caller has not asked too often.** Neither check above survives a
 *    script that drives a real browser or replays a cookie, so the last one
 *    is not about who is asking but about how much the answer can cost.
 *
 * None of this makes the routes callable "only from this front end" — anything
 * a browser sends, a program can send too. What it does is separate the two
 * callers: another party's web app is shut out, and a script is left with
 * something it has to keep working at and a ceiling on what it gets.
 */

/** A refusal in the shape the client already reads: see `RouteError`. */
function refuse(
  status: number,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json({ error: message }, { status, headers });
}

/**
 * Where this app is reached, according to the request.
 *
 * Taken from the headers rather than from `request.url`, because behind a
 * proxy — which is what a deployment on a host like Vercel sits behind — the
 * URL a route handler is given is the internal one and does not say what the
 * browser asked for.
 */
function host(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  );
}

/**
 * Whether the request was made by a page served from this app.
 *
 * `Sec-Fetch-Site` is the answer where it is sent: it is set by the browser
 * and on the list of headers a page is not allowed to write, so `same-origin`
 * is a statement the page itself could not have made. Note that `Origin` is
 * not the header to read here — a browser leaves it off a same-origin GET, so
 * requiring it would refuse every legitimate call.
 *
 * Browsers before the `Sec-Fetch-*` headers, Safari up to 16.4 among them,
 * send neither. They do send a referrer for a same-origin fetch, so that is
 * the fallback, with `Origin` ahead of it for the requests that carry one.
 * A caller that sends none of the three — which is every plain `curl` — is
 * refused.
 */
function cameFromThisOrigin(request: Request): boolean {
  const expected = host(request);
  if (!expected) return false;

  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";

  for (const header of ["origin", "referer"]) {
    const value = request.headers.get(header);
    if (!value) continue;
    try {
      return new URL(value).host === expected;
    } catch {
      return false;
    }
  }
  return false;
}

/** One cookie off the request, without reaching for the request store. */
function cookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;

  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() === name) {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    }
  }
  return undefined;
}

/** The window a caller's requests are counted in. */
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * What one caller may ask for within a window.
 *
 * Set well above what clicking through the examples takes, because a single
 * action here is not a single request: the Maps example asks for one layer per
 * element in frame, and a lookup in the Traffic example fans out to two
 * endpoints. It is a ceiling on a script, not a budget a visitor should ever
 * feel.
 */
const RATE_LIMIT_REQUESTS = 120;

/** Stops a flood of one-off callers from growing the table forever. */
const MAX_TRACKED_CALLERS = 5_000;

const windows = new Map<string, { requests: number; endsAt: number }>();

/**
 * Who to count the request against.
 *
 * `x-forwarded-for` is a list, appended to by each proxy in front of this one,
 * and the first entry is the client as the outermost proxy saw it. Nothing
 * here is trustworthy on its own — a caller can send the header too — so this
 * is a way of not counting every visitor behind one network as one caller,
 * not an identity.
 */
function caller(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Counts the request and says whether it fits, and how long the caller has to
 * wait when it does not.
 *
 * The count lives in memory, which is worth being plain about: a serverless
 * host answers from however many instances it likes and each keeps a count of
 * its own, so this caps a burst against one instance rather than a total
 * across the deployment. That makes it the cheapest layer here and the least
 * complete one. A limit that really holds belongs in front of the app, in the
 * host's firewall — see the README.
 */
function withinRateLimit(request: Request): {
  ok: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();

  // Pruned as we go, so an expired window is never counted and the table
  // stays the size of the callers that are actually active.
  if (windows.size > MAX_TRACKED_CALLERS) {
    for (const [key, window] of windows) {
      if (window.endsAt <= now) windows.delete(key);
    }
  }

  const key = caller(request);
  const window = windows.get(key);

  if (!window || window.endsAt <= now) {
    windows.set(key, { requests: 1, endsAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }

  window.requests += 1;
  if (window.requests <= RATE_LIMIT_REQUESTS) {
    return { ok: true, retryAfterSeconds: 0 };
  }
  return {
    ok: false,
    retryAfterSeconds: Math.ceil((window.endsAt - now) / 1000),
  };
}

/** What a route can say about how its requests should be counted. */
interface GuardOptions {
  /**
   * Whether the request counts towards the rate limit. False for the one route
   * that cannot reach the Platform: /api/platform-log only hands out what has
   * already been recorded, and the pages poll it every second, so counting it
   * would spend a visitor's budget on their own log.
   */
  rateLimited?: boolean;
}

/**
 * The refusal this request has earned, or null when it may go through.
 *
 * A `Response` rather than a thrown error, so `apiRoute` can answer with it
 * before it starts recording, and the routes that do not go through `apiRoute`
 * can return it as they are.
 */
export async function guardRequest(
  request: Request,
  { rateLimited = true }: GuardOptions = {},
): Promise<Response | null> {
  if (!cameFromThisOrigin(request)) {
    return refuse(403, "This route can only be called from this application.");
  }

  if (
    frontendTokenIsRequired() &&
    !(await frontendTokenIsValid(cookie(request, FRONTEND_TOKEN_COOKIE)))
  ) {
    // Also what an open page gets once its token has run out, which a reload
    // fixes: the proxy mints a fresh one with every page it serves.
    return refuse(
      403,
      "This request carried no valid session. Reload the page and try again.",
    );
  }

  if (rateLimited) {
    const { ok, retryAfterSeconds } = withinRateLimit(request);
    if (!ok) {
      return refuse(
        429,
        `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
        { "retry-after": String(retryAfterSeconds) },
      );
    }
  }

  return null;
}
