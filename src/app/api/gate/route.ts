import { NextRequest, NextResponse } from "next/server";

import {
  expectedGateToken,
  GATE_COOKIE,
  GATE_COOKIE_MAX_AGE,
  getSitePassword,
  safeEqual,
} from "@/lib/gate";

export const runtime = "nodejs";

/**
 * Exchanges the site password for the gate cookie. Failed attempts are
 * slowed down; nothing about the configured password is ever echoed.
 */
export async function POST(request: NextRequest) {
  const password = getSitePassword();
  if (!password) {
    // Gate is off; nothing to unlock.
    return NextResponse.json({ ok: true });
  }

  let attempt = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") attempt = body.password;
  } catch {
    // fall through to failure below
  }

  if (!attempt || !safeEqual(attempt.trim(), password)) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json(
      { ok: false, error: "That password is not correct." },
      { status: 401 },
    );
  }

  const token = await expectedGateToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: GATE_COOKIE,
    value: token ?? "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_COOKIE_MAX_AGE,
  });
  return response;
}
