import { apiRoute, HttpError } from "@/lib/platform";
import { observationsInArea } from "../api";
import { isSourceId, type Bounds } from "../utils";

/**
 * Area proxy for the map.
 *
 * The browser calls this route with the network and the part of the map in
 * view; it forwards them to the Observations Area API with the API key from
 * INFOPLAZA_API_KEY and returns the latest observation of every station in
 * that box, up to AREA_LIMIT of them. The key stays server-side.
 *
 * `apiRoute` wraps the answer: it adds the Platform calls this route made, so
 * the API log on the page can show them, and turns a failure into a status.
 */
export const GET = apiRoute("Failed to load observations.", async (request) => {
  const params = new URL(request.url).searchParams;
  const source = params.get("source") ?? "";
  const bounds = (params.get("bounds") ?? "").split(",").map(Number);

  if (!isSourceId(source)) {
    throw new HttpError(400, "source is required.");
  }
  if (!isBounds(bounds)) {
    throw new HttpError(
      400,
      "bounds is required, as west,south,east,north in degrees.",
    );
  }

  return await observationsInArea(source, bounds);
});

function isBounds(values: number[]): values is Bounds {
  if (values.length !== 4 || !values.every(Number.isFinite)) return false;
  const [west, south, east, north] = values;
  return (
    west >= -180 &&
    east <= 180 &&
    west < east &&
    south >= -90 &&
    north <= 90 &&
    south < north
  );
}
