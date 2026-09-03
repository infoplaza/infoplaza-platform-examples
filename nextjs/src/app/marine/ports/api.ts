import { platformGet, type Endpoint } from "@/lib/platform";
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
 * The calls go out through @/lib/platform, which attaches the key and records
 * each request and its answer for the API log at the bottom of the page.
 */

const PORT_LIST: Endpoint = {
  name: "Port List",
  url: "https://api.infoplaza.com/v1/port/list",
  docsUrl: "https://platform.infoplaza.com/reference/v1-port-list",
};

const PORT_INFO: Endpoint = {
  name: "Port Info",
  url: "https://api.infoplaza.com/v1/port/info",
  docsUrl: "https://platform.infoplaza.com/reference/v1-port-info",
};

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
  const data = await platformGet<PortListData>(PORT_LIST, {
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
  const data = await platformGet<PortInfo | { error: string }>(PORT_INFO, {
    portId: String(portId),
  });

  if ("error" in data) throw new Error(String(data.error));
  return data;
}
