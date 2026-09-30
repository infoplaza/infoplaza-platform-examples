/**
 * Where the Platform lives.
 *
 * Every endpoint these examples call is a path under one base URL, which is
 * https://api.infoplaza.com/ unless INFOPLAZA_API_URL says otherwise — to
 * point the examples at a staging or local Platform, for instance.
 *
 * Kept apart from @/lib/platform because the proxy runtime and the component
 * library route need it as well, and that module reaches for node:async_hooks.
 */

const DEFAULT_BASE_URL = "https://api.infoplaza.com/";

/**
 * The configured base URL, always ending in a slash so a path resolves under
 * it rather than replacing its last segment. Plain truthiness, so an empty
 * variable — what copying .env.example gives — counts as unset.
 */
export function platformBaseUrl(): string {
  const configured = process.env.INFOPLAZA_API_URL || DEFAULT_BASE_URL;
  return configured.endsWith("/") ? configured : `${configured}/`;
}

/**
 * The URL of a Platform endpoint, e.g. `platformUrl("v1/weather/forecast")`.
 * With `websocket`, the same URL on ws:// or wss://, for the streaming ones.
 */
export function platformUrl(
  path: string,
  { websocket = false }: { websocket?: boolean } = {},
): string {
  const url = new URL(path.replace(/^\//, ""), platformBaseUrl());
  if (websocket) url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
  return url.toString();
}
