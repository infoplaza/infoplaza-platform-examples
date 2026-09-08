import { takeProxiedCalls } from "@/lib/platform-proxy";

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
 */
export async function GET(): Promise<Response> {
  return Response.json({ apiCalls: takeProxiedCalls() });
}
