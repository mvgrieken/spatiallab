/**
 * Edge-veilige, ondertekende toegangstokens voor de e-mail-toegangspoort.
 *
 * De bezoeker laat zijn e-mail achter, krijgt een link met een token, en na het
 * klikken zetten we een `sl_access`-cookie. Zowel het uitgeven (route, Node) als
 * het verifiëren (proxy, Edge) gebeurt met **Web Crypto** (`crypto.subtle`), zodat
 * dezelfde code in de Edge-middleware werkt — node:crypto is daar niet beschikbaar.
 *
 * Formaat: `<payload-b64url>.<hmac-b64url>`, payload = `{ e: email, x: expEpochMs }`.
 * De cookie draagt exact hetzelfde token; de proxy verifieert handtekening + exp.
 * Dit is een zachte bèta-poort (bewust een e-mail-link op eigenaarsverzoek), geen
 * volwaardige authenticatie.
 */

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const enc = new TextEncoder();

function secret(): string {
  // Aparte secret als die er is, anders val terug op NEXTAUTH_SECRET (altijd gezet).
  return (
    process.env.ACCESS_LINK_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

async function hmacKey(): Promise<CryptoKey | null> {
  const s = secret();
  if (!s) return null;
  return crypto.subtle.importKey(
    "raw",
    enc.encode(s),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Geldigheidsduur van een uitgegeven link/cookie. */
export const ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dagen

/** Onderteken een toegangstoken voor `email`, geldig tot nu+ttl. */
export async function signAccessToken(
  email: string,
  ttlMs: number = ACCESS_TTL_MS,
  now: number = Date.now(),
): Promise<string | null> {
  const key = await hmacKey();
  if (!key) return null;
  const payload = b64urlEncode(enc.encode(JSON.stringify({ e: email, x: now + ttlMs })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return `${payload}.${b64urlEncode(sig)}`;
}

/**
 * Verifieer een token. Retourneert het e-mailadres bij een geldige, niet-
 * verlopen handtekening; anders null. Constante-tijd-vergelijking via
 * `crypto.subtle.verify`.
 */
export async function verifyAccessToken(
  token: string | undefined,
  now: number = Date.now(),
): Promise<string | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const key = await hmacKey();
  if (!key) return null;
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), enc.encode(payload));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as {
      e?: string;
      x?: number;
    };
    if (!data.e || typeof data.x !== "number" || data.x < now) return null;
    return data.e;
  } catch {
    return null;
  }
}

export const ACCESS_COOKIE = "sl_access";
