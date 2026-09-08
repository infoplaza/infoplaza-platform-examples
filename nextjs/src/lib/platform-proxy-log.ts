"use client";

import { useEffect } from "react";
import type { ApiCall } from "./api-call";
import { recordApiCalls } from "./api-log";

/**
 * Puts the calls the component library makes into the API log.
 *
 * The other examples file their calls as they fetch, because they fetch
 * through `fetchJson` and the route handler hands the recordings back with
 * the answer. The components fetch for themselves, so there is no answer to
 * ride along with: the recordings are collected from /api/platform-log
 * instead, for as long as the example is open.
 *
 * Polling is what makes a request the components decide to make on their own,
 * such as the models they load as they mount, show up without anything on the
 * page having asked for it.
 */

/** Often enough that a request and its recording feel like one event. */
const COLLECT_INTERVAL_MS = 1000;

export function usePlatformProxyLog(): void {
  useEffect(() => {
    const controller = new AbortController();

    async function collect() {
      try {
        const response = await fetch("/api/platform-log", {
          signal: controller.signal,
        });
        const body = (await response.json()) as { apiCalls?: ApiCall[] };
        recordApiCalls(body.apiCalls);
      } catch {
        // The example works without its log, and a collection that failed is
        // made good by the next one.
      }
    }

    collect();

    // Nothing is collected while the tab is in the background: the drawer
    // cannot be read there, and the recordings keep on the server until it
    // comes back. Coming back collects at once rather than on the next tick,
    // so the drawer is filled by the time it can be looked at.
    const timer = setInterval(() => {
      if (!document.hidden) collect();
    }, COLLECT_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) collect();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
