import { apiRoute, HttpError } from "@/lib/platform";
import { stopDepartures } from "../api";

/**
 * Departures proxy for the stop list.
 *
 * Called when someone picks a stop, either from the list or from the map. It
 * forwards the stop place id to the Transit Stop Departures API with the API
 * key from INFOPLAZA_API_KEY and returns the next hour of departures.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load departures.", async (request) => {
  const stopPlaceId =
    new URL(request.url).searchParams.get("stopplace_id")?.trim() ?? "";

  if (!stopPlaceId) throw new HttpError(400, "stopplace_id is required.");

  return stopDepartures(stopPlaceId);
});
