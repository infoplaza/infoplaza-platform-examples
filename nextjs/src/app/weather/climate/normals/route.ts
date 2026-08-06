import { climateNormals, NoClimateDataError } from "../api";
import { GRANULARITIES, type Granularity } from "../utils";

/**
 * Climate proxy for the map.
 *
 * The browser calls this route with the coordinates that were picked on the
 * map and the granularity that is selected; it forwards them to the Weather
 * Climate API with the API key from INFOPLAZA_API_KEY and returns the climate
 * year it gets back. The key stays server-side.
 *
 * A point the API has no data for answers 404 with `covered: false`, which the
 * panel shows as a hint rather than as an error.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const granularity = params.get("period") ?? "month";

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Response.json(
      { error: "lat and lon are required and must be numbers." },
      { status: 400 },
    );
  }
  if (!GRANULARITIES.some(({ value }) => value === granularity)) {
    return Response.json(
      {
        error: `period must be one of ${GRANULARITIES.map(({ value }) => value).join(", ")}.`,
      },
      { status: 400 },
    );
  }

  try {
    const climate = await climateNormals(
      latitude,
      longitude,
      granularity as Granularity,
    );
    return Response.json({ climate });
  } catch (error) {
    if (error instanceof NoClimateDataError) {
      return Response.json(
        { error: error.message, covered: false },
        { status: 404 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to load climate data.";
    return Response.json({ error: message }, { status: 502 });
  }
}
