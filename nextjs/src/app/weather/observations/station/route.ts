import { apiRoute, HttpError } from "@/lib/platform";
import { observationsAtStation } from "../api";
import { isHistoryLength, isSourceId } from "../utils";

/**
 * Station proxy for the map and the history chart.
 *
 * The browser calls this route with a network and a station id, and for the
 * history also with how many readings to fetch and the latest one to end at;
 * it forwards them to the Observations Station API with the API key from
 * INFOPLAZA_API_KEY and returns what the station measured. The key stays
 * server-side.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load the station.", async (request) => {
  const params = new URL(request.url).searchParams;
  const source = params.get("source") ?? "";
  const stationId = Number(params.get("stationId"));
  const length = params.get("readings");
  const until = params.get("until");

  if (!isSourceId(source)) {
    throw new HttpError(400, "source is required.");
  }
  if (!Number.isInteger(stationId)) {
    throw new HttpError(400, "stationId is required and must be a whole number.");
  }

  // No length asked for means the latest observation, at one credit.
  if (length === null) {
    return await observationsAtStation(source, stationId);
  }

  // Each reading in a series is a credit, so only the lengths the buttons
  // offer get through.
  const readings = Number(length);
  if (!isHistoryLength(readings)) {
    throw new HttpError(400, "readings must be one of the offered lengths.");
  }
  const end = until ? new Date(until) : new Date();
  if (Number.isNaN(end.getTime())) {
    throw new HttpError(400, "until must be a date.");
  }

  return await observationsAtStation(source, stationId, {
    length: readings,
    until: end,
  });
});
