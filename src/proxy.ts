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

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isBypassed(request.nextUrl.pathname, KILLSWITCH_BYPASS)) {
    const flags = await readFlags();
    if (shouldKill(flags, APP_SLUG)) return maintenanceResponse();
  }

  // Without full auth configuration the site is public (see README) —
  // production/preview always have the auth env vars set.
  if (!authGateEnabled()) return NextResponse.next();

  return gate(request as never, event as never);
}

export const config = {
  // Everything except Next internals and neutral assets.
  matcher: [
    "/((?!_next/static|_next/image|icon\\.svg|robots\\.txt).*)",
  ],
};
