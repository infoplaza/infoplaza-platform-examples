import { takeProxiedCalls } from "@/lib/platform-proxy";
import { guardRequest } from "@/lib/route-guard";

/**
 * The calls the component library has made since this was last asked.
 *
 * The examples built on @infoplaza/platform poll this while they are open and
 * file what it returns in the API log, which is how requests made inside the
 * package end up in the same drawer as the ones the other examples make
 * themselves. Collected recordings are dropped, so nothing is listed twice.
 *
 * It sits next to /api/platform rather than under it, because that path
 * belongs to the package: everything below it is an endpoint the components
 * may ask for.
 *
 * Gated like the rest, because the recordings hold the URLs and answers of
 * whoever asked before — but not counted against the rate limit: this route
 * reaches nothing and costs no credits, and the pages poll it every second.
 */
export async function GET(request: Request): Promise<Response> {
  const refused = await guardRequest(request, { rateLimited: false });
  if (refused) return refused;

  return Response.json({ apiCalls: takeProxiedCalls() });
}
