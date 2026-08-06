import { portList } from "../api";
import { DEFAULT_SIZES, isPortSize } from "../utils";

/**
 * Port list proxy for the map.
 *
 * The browser calls this route with the size grades ticked in the filter; it
 * forwards them to the Port List API with the API key from INFOPLAZA_API_KEY
 * and returns the ports it finds. The key stays server-side.
 */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("size") ?? "";
  const sizes = requested.split(",").filter(isPortSize);

  try {
    return Response.json({
      ports: await portList(sizes.length > 0 ? sizes : DEFAULT_SIZES),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load ports.";
    return Response.json({ error: message }, { status: 502 });
  }
}
