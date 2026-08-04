/**
 * Site-wide password gate helpers. Edge-safe: uses only Web Crypto, so the
 * same code runs in the proxy (edge) and in the API route (node).
 *
 * The cookie never contains the password itself — it holds a SHA-256 digest
 * derived from it, so a leaked cookie can't be replayed as the password
 * elsewhere and rotating SITE_PASSWORD invalidates all sessions at once.
 */

export const GATE_COOKIE = "sl_gate";
export const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const TOKEN_PREFIX = "spatiallab-gate-v1:";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The password the site is gated with; null disables the gate entirely. */
export function getSitePassword(): string | null {
  const pw = process.env.SITE_PASSWORD?.trim();
  return pw ? pw : null;
}

/** Expected cookie value for the configured password (null = gate off). */
export async function expectedGateToken(): Promise<string | null> {
  const pw = getSitePassword();
  if (!pw) return null;
  return sha256Hex(TOKEN_PREFIX + pw);
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
