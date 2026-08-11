import "server-only";

/**
 * Minimal Upstash Redis client over the REST API — no SDK, no extra dependency.
 *
 * Three rules hold everywhere in this module, and the rest of the app depends
 * on them:
 *   1. It never throws. Every failure resolves to `null`.
 *   2. It never blocks a user-facing answer. Callers treat `null` as "unknown"
 *      and carry on.
 *   3. Without credentials it is silently inert, so local development and
 *      preview builds work with no store at all.
 *
 * Region: Upstash database in Frankfurt (EU). This is the only place where
 * SpatialLab persists anything, and it stores counters and short-lived
 * technical keys only — never frames, questions, answers, addresses or audio.
 */

const TIMEOUT_MS = 2_000;

function credentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

/**
 * Is de counter-store geconfigureerd? Onderscheidt "store onbereikbaar in
 * productie" (outage → fail-closed) van "store niet ingesteld" (lokaal/dev →
 * gedrag ongewijzigd). Gebruikt door de budget-guard (S-001).
 */
export function storeConfigured(): boolean {
  return credentials() !== null;
}

export function isStoreConfigured(): boolean {
  return credentials() !== null;
}

/**
 * Run one Redis command. Returns the raw `result` value, or `null` when the
 * store is unconfigured, times out, or answers with an error.
 */
export async function redisCommand(args: string[]): Promise<unknown | null> {
  const creds = credentials();
  if (!creds) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(creds.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { result?: unknown } | null;
    return json && "result" in json ? (json.result ?? null) : null;
  } catch {
    // Never log the command: keys can carry hashed client identifiers.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Run several commands in one round trip. Returns `null` on any failure. */
export async function redisPipeline(
  commands: string[][],
): Promise<unknown[] | null> {
  const creds = credentials();
  if (!creds) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${creds.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as
      | { result?: unknown }[]
      | null;
    if (!Array.isArray(json)) return null;
    return json.map((entry) => entry?.result ?? null);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
