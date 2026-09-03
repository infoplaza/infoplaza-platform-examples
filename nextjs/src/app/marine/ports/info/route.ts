import { apiRoute, HttpError } from "@/lib/platform";
import { portInfo } from "../api";

/**
 * Port info proxy for the map.
 *
 * The browser calls this route with the id of the port that was clicked; it
 * forwards it to the Port Info API with the API key from INFOPLAZA_API_KEY
 * and returns what the index holds on that port. The key stays server-side.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load port.", async (request) => {
  const portId = Number(new URL(request.url).searchParams.get("portId"));

  if (!Number.isInteger(portId)) {
    throw new HttpError(400, "portId is required and must be a whole number.");
  }

  return { port: await portInfo(portId) };
});
