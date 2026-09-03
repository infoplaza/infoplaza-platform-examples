"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { clearApiCalls, recordApiCalls, useApiCalls } from "@/lib/api-log";
import {
  curlCommand,
  formatBytes,
  requestParams,
  type ApiCall,
} from "@/lib/api-call";

/**
 * The API log: a drawer down the right-hand side of every example page with
 * the Platform requests that page made, each one openable to show what was
 * sent and what came back.
 *
 * The calls are made on the server, so the browser's own network tab only
 * shows the route handler in front of them. This is where the real ones
 * surface. Closed, it is the button in the top right corner; open, it stays
 * put while the example is used, so a click on the map and the request it
 * causes can be watched side by side.
 *
 * One drawer belongs to one example: leaving empties the log, so opening an
 * example always starts from nothing and what is listed is always what this
 * example has asked.
 */

/** Where the open state is kept, so it carries across pages and reloads. */
const OPEN_STORAGE_KEY = "infoplaza-examples:api-log-open";

/**
 * Whether the drawer is open, kept in local storage rather than in state.
 *
 * The server cannot know what this browser last chose, so it is read after
 * hydration through `useSyncExternalStore`: the server snapshot is closed,
 * the browser snapshot is whatever was stored.
 */
const openListeners = new Set<() => void>();

function subscribeToOpen(listener: () => void): () => void {
  openListeners.add(listener);
  return () => {
    openListeners.delete(listener);
  };
}

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(OPEN_STORAGE_KEY) === "true";
  } catch {
    // Storage can be switched off entirely, which is not worth failing over.
    return false;
  }
}

function writeOpen(open: boolean): void {
  try {
    window.localStorage.setItem(OPEN_STORAGE_KEY, String(open));
  } catch {
    // Nothing to do: the drawer still opens, it just will not be remembered.
  }
  for (const listener of openListeners) listener();
}

export function ApiLog({ initialCalls = [] }: { initialCalls?: ApiCall[] }) {
  const calls = useApiCalls();
  const open = useSyncExternalStore(subscribeToOpen, readOpen, () => false);

  // The calls the page made while it was rendered on the server. They arrive
  // as a prop rather than through the store, because the store lives in the
  // browser and these were recorded before it existed.
  useEffect(() => {
    recordApiCalls(initialCalls);
  }, [initialCalls]);

  // Leaving the example empties the log, so the next one opens on an empty
  // drawer. On the way out rather than on the way in: React tears the old
  // page down before it builds the new one, so a clear here cannot catch a
  // call the next example has already made.
  useEffect(() => clearApiCalls, []);

  // Escape closes it, as it does every other layer that sits over a page.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") writeOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => writeOpen(true)}
        className="fixed right-6 top-6 z-40 flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3.5 py-2 text-sm text-gray-700 shadow-sm backdrop-blur transition-colors hover:border-gray-300 hover:text-gray-900"
      >
        API requests
        <Count value={calls.length} />
      </button>
    );
  }

  return (
    // Fixed rather than in the flow: the page keeps its full width behind it,
    // so the map stays where it was when the drawer is opened.
    <aside
      aria-label="API requests"
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-gray-200 bg-white shadow-xl sm:w-[28rem]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-gray-900">
          API requests
          <Count value={calls.length} />
        </h2>

        <div className="flex items-center gap-3">
          {calls.length > 0 && (
            <button
              type="button"
              onClick={() => clearApiCalls()}
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => writeOpen(false)}
            aria-label="Close API requests"
            className="text-gray-400 hover:text-gray-900"
          >
            <svg viewBox="0 0 14 14" aria-hidden="true" className="h-4 w-4">
              <path
                d="M3 3l8 8M11 3l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <p className="border-b border-gray-200 px-4 py-2.5 text-xs leading-relaxed text-gray-500">
        Everything this page asked the Platform API, newest lookup first. The
        calls are made on the server, so the API key never reaches the browser
        and is replaced by a placeholder here.
      </p>

      <div className="flex-1 overflow-y-auto p-3">
        {calls.length === 0 ? (
          <p className="px-1 py-2 text-sm text-gray-500">
            No requests yet. Use the example and they will appear here.
          </p>
        ) : (
          <ol className="space-y-2">
            {calls.map((call) => (
              <li key={call.id}>
                <ApiCallRow call={call} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs tabular-nums text-gray-600">
      {value}
    </span>
  );
}

/** One call: a summary line that opens into the request and the response. */
function ApiCallRow({ call }: { call: ApiCall }) {
  const [open, setOpen] = useState(false);
  const params = requestParams(call.url);
  const failed = call.status >= 400;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
      >
        <span className="mt-1">
          <Chevron open={open} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-gray-900">
            {call.name}
          </span>
          <span className="mt-0.5 flex items-center gap-2 font-mono text-xs text-gray-500">
            <span>{call.method}</span>
            <span className={failed ? "text-red-600" : "text-green-700"}>
              {call.status}
            </span>
            <span className="tabular-nums">{call.durationMs} ms</span>
            <span className="tabular-nums">
              {formatBytes(call.responseBytes)}
            </span>
          </span>
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-200 px-3 py-3">
          <Block
            title="Request"
            action={
              <CopyButton label="Copy as cURL" value={curlCommand(call)} />
            }
          >
            <Code>{`${call.method} ${call.url}`}</Code>

            {params.length > 0 && (
              <dl className="mt-3 grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-1 text-xs">
                {params.map(([name, value]) => (
                  <div key={name} className="contents">
                    <dt className="truncate font-mono text-gray-500">{name}</dt>
                    <dd className="break-all font-mono text-gray-900">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {call.requestBody && (
              <div className="mt-3">
                <p className="mb-1 text-xs text-gray-500">Body</p>
                <Code>{call.requestBody}</Code>
              </div>
            )}
          </Block>

          <Block
            title="Response"
            action={<CopyButton label="Copy" value={call.response} />}
          >
            <Code>{call.response}</Code>
            {call.truncated && (
              <p className="mt-2 text-xs text-gray-500">
                Only the first part is shown: the whole answer is{" "}
                {formatBytes(call.responseBytes)}.
              </p>
            )}
          </Block>

          <a
            href={call.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-blue-600 hover:underline"
          >
            {call.name} in the API reference →
          </a>
        </div>
      )}
    </div>
  );
}

function Block({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-md bg-gray-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all text-gray-800">
      {children}
    </pre>
  );
}

/** Copies a snippet, and says so for a moment. */
function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => setCopied(true));
      }}
      className="shrink-0 text-xs text-gray-500 hover:text-gray-900"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${
        open ? "rotate-90" : ""
      }`}
    >
      <path
        d="M4 2l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
