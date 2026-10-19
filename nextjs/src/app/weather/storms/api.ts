import { platformGet, type Endpoint } from "@/lib/platform";
import { platformUrl } from "@/lib/platform-url";
import { sortStorms, type Storm } from "./utils";

/**
 * Server-side client for the Tropical Storms API.
 *
 * It is a plain REST endpoint that takes the API key as a query parameter and
 * no other parameters: each call returns every active storm in the world. It
 * is called from the route handler in ./active only, so the key never reaches
 * the browser.
 *
 * The call goes out through @/lib/platform, which attaches the key and records
 * the request and its answer for the API log at the bottom of the page.
 */

const TROPICAL_STORMS: Endpoint = {
  name: "Tropical Storms",
  url: platformUrl("v1/storms"),
  docsUrl: "https://platform.infoplaza.com/reference/v1-storms",
};

/**
 * Every active hurricane, typhoon, cyclone and invest, strongest first. A
 * storm with no track at all would have nowhere to be drawn, so one is left
 * out should it ever come back like that.
 */
export async function activeStorms(): Promise<Storm[]> {
  const data = await platformGet<{ storms?: Storm[] }>(TROPICAL_STORMS);
  const storms = (data.storms ?? []).filter((storm) => storm.path.length > 0);
  return sortStorms(storms);
}
