import { NextResponse, type NextRequest } from "next/server";

import {
  ACCESS_COOKIE,
  ACCESS_TTL_MS,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/access-link";

export const runtime = "nodejs";

/**
 * Klikdoel van de toegangslink: verifieert het token en zet de `sl_access`-cookie,
 * daarna door naar de site. Een verse cookie-token krijgt een volle 30 dagen,
 * onafhankelijk van hoe oud de e-maillink al was.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const token = req.nextUrl.searchParams.get("token") ?? undefined;
  const email = await verifyAccessToken(token);
  if (!email) {
    return NextResponse.redirect(new URL("/toegang?error=1", req.nextUrl.origin));
  }
  const cookieToken = (await signAccessToken(email)) ?? token!;
  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.cookies.set(ACCESS_COOKIE, cookieToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(ACCESS_TTL_MS / 1000),
    path: "/",
  });
  return res;
}
