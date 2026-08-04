import { NextRequest, NextResponse } from "next/server";

import { expectedGateToken, GATE_COOKIE, safeEqual } from "@/lib/gate";

/**
 * Site-wide password gate. When SITE_PASSWORD is set, every page and API
 * route requires the gate cookie; without it, pages redirect to /gate and
 * API calls get a 401. When SITE_PASSWORD is unset the site is public.
 */
export default async function proxy(request: NextRequest) {
  const expected = await expectedGateToken();
  if (!expected) return NextResponse.next();

  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (cookie && safeEqual(cookie, expected)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "This site is password-protected." },
      { status: 401 },
    );
  }

  const gateUrl = request.nextUrl.clone();
  gateUrl.pathname = "/gate";
  gateUrl.search =
    pathname && pathname !== "/" ? `?from=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(gateUrl);
}

export const config = {
  // Everything except the gate itself, Next internals and neutral assets.
  matcher: [
    "/((?!gate|api/gate|_next/static|_next/image|icon\\.svg|robots\\.txt).*)",
  ],
};
