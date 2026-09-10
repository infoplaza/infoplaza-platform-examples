import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  FRONTEND_TOKEN_COOKIE,
  FRONTEND_TOKEN_LIFETIME_MS,
  mintFrontendToken,
} from "@/lib/frontend-token";

/**
 * Hands every page of this app the token its own fetches are asked for.
 *
 * The route handlers refuse a request that arrives without one, which is what
 * keeps their URLs from working anywhere but here; see @/lib/route-guard for
 * what that does and does not stop. Minting it is the other half, and it
 * happens here because this runs before anything is rendered and can put a
 * cookie on the way out — a Server Component cannot set one.
 *
 * Only page requests are minted for, never the route handlers themselves. It
 * has to be that way round: a route that handed out a token to whoever asked
 * would be handing out the thing it is guarded by. `Sec-Fetch-Dest` tells the
 * two apart without a list of paths to keep up to date, so a new example is
 * covered by writing it and nothing else.
 *
 * On this file's name: `proxy.ts` is what Next.js 16 calls what used to be
 * `middleware.ts`. It has nothing to do with the sense of "proxy" the rest of
 * these examples use, which is the route handlers standing between the browser
 * and the Platform.
 */

/**
 * Whether this is the browser asking for a page.
 *
 * `Sec-Fetch-Dest` is the browser's own word for what it is fetching, and
 * `document` is a page. What it accepts is the fallback for the browsers that
 * do not send the header, the same ones @/lib/route-guard makes room for.
 */
function isPageRequest(request: NextRequest): boolean {
  const destination = request.headers.get("sec-fetch-dest");
  if (destination) return destination === "document";

  return request.headers.get("accept")?.includes("text/html") ?? false;
}

/**
 * Whether the request arrived over HTTPS, which decides whether the cookie is
 * marked `Secure`.
 *
 * Read from the request rather than from the build, because both answers are
 * wrong the other way round: a production build served over http://localhost
 * would set a cookie the browser then drops, and a development server behind
 * an HTTPS tunnel would set one without the mark it should have. Behind a
 * proxy the protocol the browser used is in `x-forwarded-proto`, which is what
 * a host like Vercel sets.
 */
function overHttps(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";

  return request.nextUrl.protocol === "https:";
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  if (!isPageRequest(request)) return response;

  // Null where there is nothing to sign with, which is an app without an API
  // key: the page is served without a cookie and the route handler is left to
  // say what is missing, rather than every page failing here over a token
  // that is beside the point.
  const token = await mintFrontendToken();
  if (!token) return response;

  response.cookies.set(FRONTEND_TOKEN_COOKIE, token, {
    // The token is only ever read on the server, so no script needs to see it
    // and none should be able to: that is what keeps a cross-site script from
    // walking off with a working one.
    httpOnly: true,
    // The cookie is for this app's own fetches, so it has no business riding
    // along on a request another site started.
    sameSite: "strict",
    // Not over plain HTTP, where localhost has no certificate to be sent over.
    secure: overHttps(request),
    path: "/",
    maxAge: Math.floor(FRONTEND_TOKEN_LIFETIME_MS / 1000),
  });

  return response;
}

export const config = {
  /**
   * Everything but the route handlers under /api, the framework's own assets
   * and anything with a file extension, which is what is served from public/.
   * A page is the only thing left, and `isPageRequest` has the final say.
   */
  matcher: ["/((?!api/|_next/|.*\\.[^/]*$).*)"],
};
