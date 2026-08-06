import {
  DEFAULT_SIZES,
  sortSizes,
  type Port,
  type PortInfo,
  type PortSize,
} from "./utils";

/**
 * Server-side client for the Port List and Port Info APIs.
 *
 * Both are plain REST endpoints that take the API key as a query parameter,
 * so they are called from the server only and the browser talks to the route
 * handlers in ./list and ./info instead. That keeps the key out of the client
 * bundle.
 *
 * API reference:
 * - https://platform.infoplaza.com/reference/v1-port-list
 * - https://platform.infoplaza.com/reference/v1-port-info
 */

const PORT_LIST_URL = "https://api.infoplaza.com/v1/port/list";
const PORT_INFO_URL = "https://api.infoplaza.com/v1/port/info";

function requireApiKey(): string {
  const apiKey = process.env.INFOPLAZA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "INFOPLAZA_API_KEY is not set. Copy .env.example to .env.local and add your API key.",
    );
  }
  return apiKey;
}

/** Envelope every Platform REST endpoint wraps its payload in. */
interface PlatformResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

/** Calls a Platform endpoint with the API key attached and unwraps `data`. */
async function platformGet<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", requireApiKey());

  const response = await fetch(url, { cache: "no-store" });
  const body = (await response
    .json()
    .catch(() => null)) as PlatformResponse<T> | null;

  if (!response.ok || !body?.success || !body.data) {
    throw new Error(
      body?.error?.message ?? `Infoplaza returned HTTP ${response.status}.`,
    );
  }
  return body.data;
}

/** What the list endpoint answers with. */
interface PortListData {
  ports: Port[];
  portCount: number;
}

/**
 * Every port of the requested sizes, with its position and country.
 *
 * `size` takes more than one grade at once, comma separated: repeating the
 * parameter keeps only the last value, so the grades are joined here instead.
 * Asking for nothing means asking for `large`, which is what the endpoint
 * itself defaults to.
 *
 * The whole set is returned in one call — 170 ports for `large`, close to
 * 3,700 with every grade — so the answer is worth holding on to rather than
 * refetching per view.
 */
export async function portList(
  sizes: PortSize[] = DEFAULT_SIZES,
): Promise<Port[]> {
  const requested = sizes.length > 0 ? sortSizes(sizes) : DEFAULT_SIZES;
  const data = await platformGet<PortListData>(PORT_LIST_URL, {
    size: requested.join(","),
  });
  return data.ports ?? [];
}

/**
 * Everything the index holds on one port: its depths, what it can handle and
 * what it can supply.
 *
 * A port id that does not exist is not an error to the endpoint — it answers
 * 200 with `success: true` and an `error` string where the port should be —
 * so that case is turned into a real failure here.
 */
export async function portInfo(portId: number): Promise<PortInfo> {
  const data = await platformGet<PortInfo | { error: string }>(PORT_INFO_URL, {
    portId: String(portId),
  });

  if ("error" in data) throw new Error(String(data.error));
  return data;
}
