/**
 * The token that says a request came from a page of this app.
 *
 * The route handlers in these examples attach the API key and forward the
 * request, which makes a URL like
 * /geo/nearby/place?lat=52.02&lon=5.16&radius=10000 a working, key-free copy
 * of a paid endpoint: anyone who has seen one can spend the credits behind it
 * from anywhere. This is what takes that away. The app hands a signed token to
 * its own pages and asks for it back on every call, so the URL on its own is
 * no longer enough — a caller has to load a page first, and keep loading one.
 *
 * It travels in an HttpOnly cookie, minted in ../proxy.ts on the way out of a
 * page request. A cookie rather than a header, because the two examples built
 * on @infoplaza/platform fetch from inside the package: those requests are not
 * ours to add a header to, and a cookie the browser attaches by itself covers
 * them along with everything else.
 *
 * The token says nothing but when it expires, and it is signed so that nothing
 * but this app can write one. Verifying it is a signature check and a clock
 * read with no state behind them, which is what lets it work on a host that
 * answers every request from a fresh instance with nothing shared between them.
 *
 * What this stops and what it does not is written down in the README, under
 * "Before you deploy this publicly".
 */

/** The cookie the token travels in. */
export const FRONTEND_TOKEN_COOKIE = "ip-frontend-token";

/**
 * How long a minted token is good for.
 *
 * Generous, because a page that is left open has to keep working: the Maps
 * example is watched rather than clicked, and a visitor who does click gets a
 * fresh token with every page they load anyway. What the token carries is a
 * deadline and nothing else — no visitor, no session, no permission — so a
 * long life gives away little, and it is the rate limit rather than this that
 * decides how much a caller can ask for.
 */
export const FRONTEND_TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1000;

/**
 * Signed along with the deadline, and mixed into the key derived below.
 *
 * It keeps this signature from meaning anything anywhere else: a token minted
 * by another version, or a MAC produced for another purpose under the same
 * secret, does not verify here.
 */
const TOKEN_LABEL = "infoplaza-examples/frontend-token/v1";

const utf8 = new TextEncoder();

/**
 * What the token is signed with, or null where there is nothing to sign it
 * with.
 *
 * FRONTEND_TOKEN_SECRET when it is set. Without it the API key stands in,
 * derived rather than used as it is: it is the one secret every deployment of
 * this example already has, which keeps it runnable with nothing but the key
 * the README asks for.
 *
 * Both callers below read the answer from here, so that whether a token is
 * asked for and what it is signed with cannot come apart. Note the plain
 * truthiness: an environment variable that is present but empty — which is
 * what copying .env.example gives, and what a blank field in a host's
 * dashboard gives — has to count as unset, or a deployment would quietly stop
 * asking for a token while still being able to mint one.
 */
function secret(): { value: string; derive: boolean } | null {
  const configured = process.env.FRONTEND_TOKEN_SECRET;
  if (configured) return { value: configured, derive: false };

  // Read here rather than through @/lib/platform, which the proxy runtime
  // cannot load: that module reaches for node:async_hooks to follow the calls
  // a route handler makes.
  const apiKey = process.env.INFOPLAZA_API_KEY;
  if (apiKey) return { value: apiKey, derive: true };

  return null;
}

/**
 * Whether a token is asked for at all.
 *
 * False only where there is nothing to sign one with, which is an app without
 * an API key. Nothing can be spent there and no route can answer, so the gate
 * steps aside rather than refuse every request for a reason that is not the
 * real one: the handler then says what is actually missing.
 */
export function frontendTokenIsRequired(): boolean {
  return secret() !== null;
}

/**
 * The key the token is signed with, or null where there is none.
 *
 * Derived per call rather than kept, because this module is imported by the
 * proxy as well, and that runtime is not one to hold anything in.
 */
async function signingKey(): Promise<CryptoKey | null> {
  const source = secret();
  if (!source) return null;

  // The derivation is an HMAC under a label of its own, which is what keeps
  // the signing key from being turned back into the API key it came from.
  const material: BufferSource = source.derive
    ? await derivedFrom(source.value)
    : utf8.encode(source.value);

  return crypto.subtle.importKey(
    "raw",
    material,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/** The API key, put through an HMAC under the label so it cannot be read back. */
async function derivedFrom(apiKey: string): Promise<ArrayBuffer> {
  const label = await crypto.subtle.importKey(
    "raw",
    utf8.encode(TOKEN_LABEL),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", label, utf8.encode(apiKey));
}

/** The signature over a deadline, as hex, which is safe in a cookie as it is. */
async function sign(deadline: string): Promise<string | null> {
  const key = await signingKey();
  if (!key) return null;

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    utf8.encode(`${TOKEN_LABEL}:${deadline}`),
  );
  return [...new Uint8Array(mac)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * A token good until FRONTEND_TOKEN_LIFETIME_MS from now, or null where there
 * is nothing to sign it with — see `frontendTokenIsRequired`.
 */
export async function mintFrontendToken(
  now: number = Date.now(),
): Promise<string | null> {
  const expiresAt = now + FRONTEND_TOKEN_LIFETIME_MS;
  const signature = await sign(String(expiresAt));
  return signature && `${expiresAt}.${signature}`;
}

/** Whether a token was minted by this app and has not run out. */
export async function frontendTokenIsValid(
  token: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;

  const [deadline, signature] = token.split(".");
  if (!deadline || !signature) return false;

  const expiresAt = Number(deadline);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const expected = await sign(deadline);
  return expected !== null && constantTimeEquals(signature, expected);
}

/**
 * Compares two signatures without letting how long it took say how much of
 * one matched, which is what keeps a wrong signature from being guessed one
 * character at a time.
 */
function constantTimeEquals(one: string, other: string): boolean {
  if (one.length !== other.length) return false;

  let difference = 0;
  for (let index = 0; index < one.length; index += 1) {
    difference |= one.charCodeAt(index) ^ other.charCodeAt(index);
  }
  return difference === 0;
}
