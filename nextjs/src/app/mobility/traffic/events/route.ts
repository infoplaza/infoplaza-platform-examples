import { apiRoute } from "@/lib/platform";
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
 *
 * `apiRoute` wraps the answer: it adds both Platform calls to it, so the API
 * log on the page can show them, and turns a failure into a status.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute("Failed to load traffic.", async () => {
  // Neither call depends on the other, so they go out side by side.
  const [features, overview] = await Promise.all([
    trafficGeo(),
    trafficOverview(),
  ]);

  return {
    events: mergeEvents(features, overview.events),
    summary: overview.summary,
  };
});
