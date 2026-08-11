import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

import { authConfig, authGateEnabled } from "@/lib/auth.config";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/access-link";
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
  //   "false"  → public bèta launch: the site is behind a soft e-mail gate
  //              (leave your email → click the link → `sl_access` cookie).
  //              /admin keeps its own login; the gate pages stay open.
  //   anything else (default / pre-launch) → the whole site is behind login.
  if (process.env.AUTH_REQUIRED === "false") {
    const { pathname } = request.nextUrl;

    // /admin (+ its APIs) keeps the full email+password login.
    if (
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname.startsWith("/api/admin/")
    ) {
      return gate(request as never, event as never);
    }

    // The e-mail gate itself, the auth API and the login page stay open.
    if (
      pathname === "/toegang" ||
      pathname.startsWith("/toegang/") ||
      pathname.startsWith("/api/toegang/") ||
      pathname.startsWith("/api/auth/") ||
      pathname === "/login"
    ) {
      return NextResponse.next();
    }

    // Everything else needs a valid access cookie.
    const token = request.cookies.get(ACCESS_COOKIE)?.value;
    if (await verifyAccessToken(token)) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Access required." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/toegang", request.nextUrl.origin));
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
