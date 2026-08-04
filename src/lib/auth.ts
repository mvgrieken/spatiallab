import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/lib/auth.config";

/**
 * Email + password login, personal-first: exactly one allowed account,
 * defined by environment variables — no self-registration, no database.
 *
 *   AUTH_ALLOWED_EMAIL   the only email that may sign in
 *   AUTH_PASSWORD_HASH   bcrypt hash of that account's password, stored
 *                        base64-encoded — bcrypt hashes contain `$`, which
 *                        dotenv-expand mangles in .env files (raw `$2…`
 *                        hashes are also accepted, for hand-set values)
 *
 * Credentials logins require JWT sessions (NextAuth creates no database
 * sessions for credentials) — same pattern as the other atthis apps.
 */

class InvalidLoginError extends CredentialsSignin {
  code = "invalid_credentials";
}

// Best-effort in-process throttle (no database): after MAX_FAILS failed
// attempts within WINDOW_MS, that email is locked for LOCK_MS. Serverless
// instances each keep their own counter, so this slows attackers rather than
// hard-stopping them; the bcrypt cost and the failure delay do the rest.
const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map<string, { fails: number; firstAt: number; lockedUntil: number }>();

/** Accepts a base64-encoded bcrypt hash (preferred) or a raw `$2…` hash. */
function readPasswordHash(): string | null {
  const raw = process.env.AUTH_PASSWORD_HASH?.trim();
  if (!raw) return null;
  if (raw.startsWith("$2")) return raw;
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return decoded.startsWith("$2") ? decoded : null;
  } catch {
    return null;
  }
}

function isLocked(key: string, now: number): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (now - entry.firstAt > WINDOW_MS && now > entry.lockedUntil) {
    attempts.delete(key);
    return false;
  }
  return now < entry.lockedUntil;
}

function registerFailure(key: string, now: number): void {
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { fails: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  entry.fails += 1;
  if (entry.fails >= MAX_FAILS) entry.lockedUntil = now + LOCK_MS;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) throw new InvalidLoginError();

        const allowedEmail = process.env.AUTH_ALLOWED_EMAIL?.trim().toLowerCase();
        const passwordHash = readPasswordHash();
        // Not configured → nobody signs in (fail closed at the login step).
        if (!allowedEmail || !passwordHash) throw new InvalidLoginError();

        const now = Date.now();
        if (isLocked(email, now)) throw new InvalidLoginError();

        // Same generic error for wrong email and wrong password (no user
        // enumeration); bcrypt always runs so timing stays comparable.
        const passwordOk = await bcrypt.compare(password, passwordHash);
        if (email !== allowedEmail || !passwordOk) {
          registerFailure(email, now);
          await new Promise((r) => setTimeout(r, 800));
          throw new InvalidLoginError();
        }

        attempts.delete(email);
        return { id: "owner", email: allowedEmail };
      },
    }),
  ],
});
