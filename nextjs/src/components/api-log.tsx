"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  clearApiCalls,
  recordApiCalls,
  useApiCalls,
  type LoggedApiCall,
} from "@/lib/api-log";
import {
  curlCommand,
  formatBytes,
  requestParams,
  type ApiCall,
} from "@/lib/api-call";

/**
 * The API log every example page ends with: the Platform requests the page
 * made, in the order they went out, each one openable to show what was sent
 * and what came back.
 *
 * The calls are made on the server, so the browser's own network tab only
 * shows the route handler in front of them. This is where the real ones
 * surface. The section remembers whether it was left open, so it stays open
 * from one example to the next once it has been opened.
 */

/** Where the open state is kept, so it carries across pages and reloads. */
const OPEN_STORAGE_KEY = "infoplaza-examples:api-log-open";

/**
 * Whether the section is open, kept in local storage rather than in state.
 *
 * The server cannot know what this browser last chose, so it is read after
 * hydration through `useSyncExternalStore`: the server snapshot is closed,
 * the browser snapshot is whatever was stored, and every section on the page
 * moves together when one of them is toggled.
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
    // Nothing to do: the section still opens, it just will not be remembered.
  }
  for (const listener of openListeners) listener();
}

function useOpen(): boolean {
  return useSyncExternalStore(subscribeToOpen, readOpen, () => false);
}

export function ApiLog({ initialCalls = [] }: { initialCalls?: ApiCall[] }) {
  const pathname = usePathname();
  const calls = useApiCalls();
  const open = useOpen();

  // The calls the page made while it was rendered on the server. They arrive
  // as a prop rather than through the store, because the store lives in the
  // browser and these were recorded before it existed.
  useEffect(() => {
    recordApiCalls(initialCalls, pathname);
  }, [initialCalls, pathname]);

  return (
    <section className="mt-12 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => writeOpen(!open)}
          aria-expanded={open}
          className="group flex items-center gap-2 text-left"
        >
          <Chevron open={open} />
          <span className="text-sm font-medium text-gray-900 group-hover:text-gray-600">
            API requests
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs tabular-nums text-gray-600">
            {calls.length}
          </span>
        </button>

        {open && calls.length > 0 && (
          <button
            type="button"
            onClick={() => clearApiCalls(pathname)}
            className="text-xs text-gray-500 hover:text-gray-900"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4">
          <p className="text-xs text-gray-500">
            Everything this page asked the Platform API, newest first. The
            calls are made on the server, so the API key never reaches the
            browser and is replaced by a placeholder here.
          </p>

          {calls.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No requests yet. Use the example above and they will appear here.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {calls.map((call) => (
                <li key={call.id}>
                  <ApiCallRow call={call} />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

/** One call: a summary line that opens into the request and the response. */
function ApiCallRow({ call }: { call: LoggedApiCall }) {
  const [open, setOpen] = useState(false);
  const params = requestParams(call.url);
  const failed = call.status >= 400;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50"
      >
        <Chevron open={open} />
        <span className="w-9 shrink-0 font-mono text-xs font-medium text-gray-500">
          {call.method}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
          {call.name}
        </span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs tabular-nums ${
            failed ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {call.status}
        </span>
        <span className="w-16 shrink-0 text-right text-xs tabular-nums text-gray-500">
          {call.durationMs} ms
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-200 bg-white px-3 py-4">
          <Block
            title="Request"
            action={<CopyButton label="Copy as cURL" value={curlCommand(call)} />}
          >
            <Code>{`${call.method} ${call.url}`}</Code>

            {params.length > 0 && (
              <dl className="mt-3 grid grid-cols-[minmax(0,10rem)_1fr] gap-x-4 gap-y-1 text-xs">
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
            note={`${formatBytes(call.responseBytes)}${
              call.truncated ? ", shortened below" : ""
            }`}
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
  note,
  action,
  children,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {title}
          {note && <span className="ml-2 normal-case text-gray-400">{note}</span>}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-gray-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all text-gray-800">
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
