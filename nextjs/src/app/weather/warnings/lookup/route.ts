import { weatherWarnings } from "../api";
import { DEFAULT_LANGUAGE, isLanguageCode } from "../utils";

/**
 * Warnings proxy for the map.
 *
 * The browser calls this route with the coordinates that were picked on the
 * map; it forwards them to the Weather Warnings API with the API key from
 * INFOPLAZA_API_KEY and returns the warnings it finds. The key stays
 * server-side.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const requested = params.get("language") ?? DEFAULT_LANGUAGE;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Response.json(
      { error: "lat and lon are required and must be numbers." },
      { status: 400 },
    );
  }

  const language = isLanguageCode(requested) ? requested : DEFAULT_LANGUAGE;

  try {
    return Response.json({
      warnings: await weatherWarnings(latitude, longitude, language),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load warnings.";
    return Response.json({ error: message }, { status: 502 });
  }
}
