import { stopDepartures } from "../api";

/**
 * Departures proxy for the stop list.
 *
 * Called when someone picks a stop, either from the list or from the map. It
 * forwards the stop place id to the Transit Stop Departures API with the API
 * key from INFOPLAZA_API_KEY and returns the next hour of departures.
 */
export async function GET(request: Request) {
  const stopPlaceId =
    new URL(request.url).searchParams.get("stopplace_id")?.trim() ?? "";

  if (!stopPlaceId) {
    return Response.json(
      { error: "stopplace_id is required." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await stopDepartures(stopPlaceId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load departures.";
    return Response.json({ error: message }, { status: 502 });
  }
}
