/**
 * One request to the Infoplaza Platform API, recorded so the page can show it.
 *
 * Every example talks to the Platform from the server, which means the calls
 * that matter are invisible in the browser's network tab: all it sees is the
 * route handler in front of them. So the server records each upstream call it
 * makes and sends the recording along with the answer, and the panel at the
 * bottom of every page replays it.
 *
 * The recording travels to the browser, so it never carries the API key: the
 * key in `url` is replaced by API_KEY_PLACEHOLDER before it leaves the server.
 */
export interface ApiCall {
  /** Stable id, so a recording that arrives twice is only listed once. */
  id: string;
  /** The endpoint in words, e.g. "Weather Warnings". */
  name: string;
  /** The endpoint in the Platform reference. */
  docsUrl: string;
  /** "GET", "POST", or "WS" for the WebSocket endpoints. */
  method: string;
  /** The full request URL, with the API key replaced. */
  url: string;
  /** What was sent as the body, pretty-printed. Absent for a plain GET. */
  requestBody?: string;
  /** HTTP status, or 101 for a WebSocket that was accepted. */
  status: number;
  /** How long the call took, in milliseconds. */
  durationMs: number;
  /**
   * What the call cost, as the answer reported it in `meta.credits`. Null for
   * the WebSocket endpoints, which send no such count.
   */
  credits: number | null;
  /** When it went out, as unix milliseconds, so a fan-out lists in order. */
  startedAt: number;
  /** The answer, pretty-printed when it is JSON and verbatim when it is not. */
  response: string;
  /** Bytes the answer had before it was shortened. */
  responseBytes: number;
  /** True when `response` holds the opening of a longer answer. */
  truncated: boolean;
}

/** Stands in for the API key wherever a recorded URL is shown. */
export const API_KEY_PLACEHOLDER = "YOUR_API_KEY";

/**
 * Takes the API key out of a URL. It is a query parameter on every Platform
 * endpoint, so this is the only place it can hide.
 */
export function redactApiKey(url: string): string {
  const redacted = new URL(url);
  if (redacted.searchParams.has("api_key")) {
    redacted.searchParams.set("api_key", API_KEY_PLACEHOLDER);
  }
  return redacted.toString();
}

/** The query parameters of a recorded URL, in the order they were sent. */
export function requestParams(url: string): [string, string][] {
  try {
    return [...new URL(url).searchParams.entries()];
  } catch {
    return [];
  }
}

/** "1.2 kB", "3.4 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} kB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/**
 * What a list of calls cost together. A call that reported no count adds
 * nothing to it, so the total is what the Platform actually charged for.
 */
export function totalCredits(calls: ApiCall[]): number {
  return calls.reduce((total, call) => total + (call.credits ?? 0), 0);
}

/** "1 credit", "12 credits", and what a WebSocket exchange says: nothing. */
export function formatCredits(credits: number | null): string {
  if (credits === null) return "credits not reported";
  return `${credits} ${credits === 1 ? "credit" : "credits"}`;
}

/**
 * The same call as a cURL command, so it can be pasted into a terminal after
 * the placeholder is swapped for a real key.
 */
export function curlCommand(call: ApiCall): string {
  if (call.method === "WS") {
    return `# ${call.name} is a WebSocket endpoint; cURL cannot speak it.\n# wss URL: ${call.url}`;
  }

  const lines = [`curl '${call.url}'`];
  if (call.method !== "GET") lines.push(`  -X ${call.method}`);
  if (call.requestBody) {
    lines.push(`  -H 'Content-Type: application/json'`);
    lines.push(`  -d '${call.requestBody.replace(/'/g, `'\\''`)}'`);
  }
  return lines.join(" \\\n");
}
