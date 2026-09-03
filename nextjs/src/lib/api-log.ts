"use client";

import { useSyncExternalStore } from "react";
import type { ApiCall } from "./api-call";

/**
 * The browser's side of the API log: a small store the drawer reads from, and
 * the fetch helper that fills it.
 *
 * It sits outside React because the recordings arrive from ordinary fetch
 * helpers, some of them module-level functions rather than components. A
 * plain store with `useSyncExternalStore` lets any of them report a call
 * without threading a context through the panel.
 *
 * The log holds one visit to one example: opening another example empties it,
 * which the drawer does as it goes. So what is listed is always what the
 * example on screen has asked, and nothing from before it.
 */

/** Enough to look back over a session of clicking; the rest falls off. */
const MAX_CALLS = 50;

let calls: ApiCall[] = [];
const listeners = new Set<() => void>();

/** Stable empty snapshot, so server rendering has nothing to hydrate wrong. */
const NONE: ApiCall[] = [];

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(next: ApiCall[]): void {
  calls = next;
  for (const listener of listeners) listener();
}

/**
 * Files the calls a route handler reported.
 *
 * The newest lookup goes on top, and the calls within it stay in the order
 * they went out — a lookup that fans out into seven calls reads down the
 * drawer the way it happened. Ids that are already listed are ignored, so a
 * recording that arrives twice — React runs effects twice in development —
 * is only shown once.
 */
export function recordApiCalls(recorded: ApiCall[] | undefined): void {
  if (!recorded?.length) return;

  const known = new Set(calls.map((call) => call.id));
  const added = recorded.filter((call) => !known.has(call.id));
  if (added.length === 0) return;

  publish([...added, ...calls].slice(0, MAX_CALLS));
}

/** Empties the log. Done on the Clear button, and on leaving an example. */
export function clearApiCalls(): void {
  if (calls.length === 0) return;
  publish([]);
}

/** The calls made since this example was opened, newest lookup first. */
export function useApiCalls(): ApiCall[] {
  return useSyncExternalStore(
    subscribe,
    () => calls,
    () => NONE,
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
