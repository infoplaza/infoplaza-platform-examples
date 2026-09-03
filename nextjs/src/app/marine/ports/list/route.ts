import { apiRoute } from "@/lib/platform";
import { portList } from "../api";
import { DEFAULT_SIZES, isPortSize } from "../utils";

/**
 * Port list proxy for the map.
 *
 * The browser calls this route with the size grades ticked in the filter; it
 * forwards them to the Port List API with the API key from INFOPLAZA_API_KEY
 * and returns the ports it finds. The key stays server-side.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load ports.", async (request) => {
  const requested = new URL(request.url).searchParams.get("size") ?? "";
  const sizes = requested.split(",").filter(isPortSize);

  return { ports: await portList(sizes.length > 0 ? sizes : DEFAULT_SIZES) };
});
