import { trafficGeo, trafficOverview } from "../api";
import { mergeEvents } from "../utils";

/**
 * Traffic proxy for the panel.
 *
 * The browser asks this route for the current traffic; it calls both Traffic
 * APIs with the API key from INFOPLAZA_API_KEY, merges them into the single
 * list the page shows and returns that. The key stays server-side.
 *
 * Traffic changes by the minute, so nothing here is cached.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Neither call depends on the other, so they go out side by side.
    const [features, overview] = await Promise.all([
      trafficGeo(),
      trafficOverview(),
    ]);

    return Response.json({
      events: mergeEvents(features, overview.events),
      summary: overview.summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load traffic.";
    return Response.json({ error: message }, { status: 502 });
  }
}
