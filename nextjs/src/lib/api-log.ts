"use client";

import { useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { ApiCall } from "./api-call";

/**
 * The browser's side of the API log: a small store the panel at the bottom of
 * every page reads from, and the fetch helper that fills it.
 *
 * It sits outside React because the recordings arrive from ordinary fetch
 * helpers, some of them module-level functions rather than components. A
 * plain store with `useSyncExternalStore` lets any of them report a call
 * without threading a context through the panel.
 */

/** A recorded call, with the page it was made from. */
export interface LoggedApiCall extends ApiCall {
  page: string;
}

/** Enough to look back over a session of clicking; the rest falls off. */
const MAX_CALLS = 50;

let calls: LoggedApiCall[] = [];
const listeners = new Set<() => void>();

/** Stable empty snapshot, so server rendering has nothing to hydrate wrong. */
const NONE: LoggedApiCall[] = [];

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next: LoggedApiCall[]): void {
  calls = next;
  for (const listener of listeners) listener();
}

/**
 * Files the calls a route handler reported.
 *
 * The newest lookup goes on top, and the calls within it stay in the order
 * they went out — a lookup that fans out into seven calls reads down the
 * page the way it happened. Ids that are already listed are ignored, so a
 * recording that arrives twice — React runs effects twice in development —
 * is only shown once.
 */
export function recordApiCalls(
  recorded: ApiCall[] | undefined,
  page: string = window.location.pathname,
): void {
  if (!recorded?.length) return;

  const known = new Set(calls.map((call) => call.id));
  const added = recorded
    .filter((call) => !known.has(call.id))
    .map((call) => ({ ...call, page }));
  if (added.length === 0) return;

  publish([...added, ...calls].slice(0, MAX_CALLS));
}

/** Empties the log for one page, leaving the other pages' calls alone. */
export function clearApiCalls(page: string): void {
  publish(calls.filter((call) => call.page !== page));
}

/**
 * The calls made from the page this is rendered on. Filtering by page rather
 * than clearing on navigation keeps a request that is still in flight from
 * wiping the log of the page it lands on.
 */
export function useApiCalls(): LoggedApiCall[] {
  const pathname = usePathname();
  const all = useSyncExternalStore(
    subscribe,
    () => calls,
    () => NONE,
  );

  return useMemo(
    () => all.filter((call) => call.page === pathname),
    [all, pathname],
  );
}

/**
 * A route handler that answered with an error. The body comes along because a
 * route can say more than the message does: the Climate route marks a location
 * it has no data for with `covered: false`.
 */
export class RouteError extends Error {
  constructor(
    message: string,
    readonly body: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RouteError";
  }
}

/**
 * GETs one of the route handlers in these examples, files the Platform calls
 * it reports and returns its payload. Throws a RouteError when the route
 * answered with one, so the calls behind a failure are logged as well.
 */
export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, signal ? { signal } : undefined);
  const body = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { apiCalls?: ApiCall[]; error?: string })
    | null;

  recordApiCalls(body?.apiCalls);

  if (!response.ok || !body) {
    throw new RouteError(body?.error ?? "Request failed.", body ?? {});
  }
  return body as T;
}
