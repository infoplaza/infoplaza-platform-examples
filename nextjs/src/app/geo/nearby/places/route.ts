import { nearbyPlaces } from "../api";

/**
 * Nearby-places proxy for the map.
 *
 * The browser calls this route with the coordinates that were picked on the
 * map; it forwards them to the Geo Nearby API with the API key from
 * INFOPLAZA_API_KEY and returns the places it finds. The key stays server-side.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Response.json(
      { error: "lat and lon are required and must be numbers." },
      { status: 400 },
    );
  }

  try {
    return Response.json({ places: await nearbyPlaces(latitude, longitude) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load nearby places.";
    return Response.json({ error: message }, { status: 502 });
  }
}
