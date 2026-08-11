import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

import { authConfig, authGateEnabled } from "@/lib/auth.config";
import { isBypassed, maintenanceResponse, shouldKill } from "@/lib/killswitch";
import { readFlags } from "@/lib/killswitch-read";

/**
 * Request pipeline, in fleet-standard order:
 *   1. killswitch (Edge Config) — "down is down", also for the login page;
 *   2. auth gate — email + password session (NextAuth JWT), one account.
 *
 * The NextAuth instance here is built from the Node-free authConfig only,
 * so the proxy stays edge-safe (JWT decoding, no bcrypt).
 */

const APP_SLUG = "spatiallab";
const KILLSWITCH_BYPASS: string[] = [];

const { auth } = NextAuth(authConfig);

const gate = auth((req) => {
  const { pathname } = req.nextUrl;
  const open = pathname === "/login" || pathname.startsWith("/api/auth/");
  if (!open && !req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  return NextResponse.next();
});

/** Fleet convention: with AUTH_REQUIRED=true a missing/incomplete auth
 *  configuration fails CLOSED (503) instead of leaving the site public. */
function misconfiguredResponse(): Response {
  return new Response(
    "Service temporarily unavailable (auth not configured).",
    {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    },
  );
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isBypassed(request.nextUrl.pathname, KILLSWITCH_BYPASS)) {
    const flags = await readFlags();
    if (shouldKill(flags, APP_SLUG)) return maintenanceResponse();
  }

  if (!authGateEnabled()) {
    // Fail closed when the gate is required but not (fully) configured;
    // without AUTH_REQUIRED the site is deliberately public (launch mode).
    if (process.env.AUTH_REQUIRED === "true") return misconfiguredResponse();
    return NextResponse.next();
  }

  // Auth is configured. AUTH_REQUIRED chooses the SCOPE of the gate:
  //   "false"  → public launch: only /admin (+ its APIs) stays behind login,
  //              the experiments are public; the admin login keeps working.
  //   anything else (default / pre-launch) → the whole site is behind login.
  if (process.env.AUTH_REQUIRED === "false") {
    const { pathname } = request.nextUrl;
    const adminOnly =
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname.startsWith("/api/admin/");
    if (!adminOnly) return NextResponse.next();
  }

  return gate(request as never, event as never);
}

export const config = {
  // Everything except Next internals and neutral assets. Icons must stay
  // public (iOS fetches apple-icon.png without cookies for the home screen),
  // and sitemap.xml must match robots.txt, which publicly references it.
  matcher: [
    "/((?!_next/static|_next/image|icon\\.svg|icon\\.png|apple-icon\\.png|logo\\.svg|logo-mark\\.svg|robots\\.txt|sitemap\\.xml).*)",
  ],
};
