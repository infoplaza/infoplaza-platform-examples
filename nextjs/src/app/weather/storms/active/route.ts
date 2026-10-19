import { apiRoute } from "@/lib/platform";
import { activeStorms } from "../api";

/**
 * Storms proxy for the panel.
 *
 * The browser asks this route for the active storms; it calls the Tropical
 * Storms API with the API key from INFOPLAZA_API_KEY and returns them, the
 * strongest first. The key stays server-side.
 *
 * Advisories come out every few hours, but the point is to show the latest
 * one, so nothing here is cached.
 *
 * `apiRoute` wraps the answer: it adds the Platform call to it, so the API log
 * on the page can show it, and turns a failure into a status.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute("Failed to load storms.", async () => {
  return { storms: await activeStorms() };
});
