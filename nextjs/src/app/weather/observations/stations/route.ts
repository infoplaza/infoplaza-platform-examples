import { apiRoute, HttpError } from "@/lib/platform";
import { observationStations } from "../api";
import { isSourceId } from "../utils";

/**
 * Stations proxy for the map.
 *
 * The browser calls this route with the network picked in the select; it
 * forwards it to the Observation Stations API with the API key from
 * INFOPLAZA_API_KEY and returns every station of that network. The key stays
 * server-side.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load stations.", async (request) => {
  const source = new URL(request.url).searchParams.get("source") ?? "";

  if (!isSourceId(source)) {
    throw new HttpError(400, "source is required.");
  }

  return { stations: await observationStations(source) };
});
