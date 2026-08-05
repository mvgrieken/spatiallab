import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isMockMode } from "@/lib/config";
import { mockRoofResult } from "@/lib/roof/mock";
import { analyzeRoofByAddress, RoofLookupError } from "@/lib/roof/pdok";

export const runtime = "nodejs";
export const maxDuration = 180;

const querySchema = z.string().trim().min(3).max(120);

const STATUS_BY_KIND: Record<string, number> = {
  address: 404,
  no_building: 404,
  no_roof: 422,
  upstream: 502,
};

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(request.nextUrl.searchParams.get("q"));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter a Dutch street address (street + number + place)." },
      { status: 400 },
    );
  }

  if (isMockMode()) {
    return NextResponse.json({ ok: true, result: mockRoofResult(), mock: true });
  }

  try {
    const result = await analyzeRoofByAddress(parsed.data);
    return NextResponse.json({ ok: true, result, mock: false });
  } catch (err) {
    if (err instanceof RoofLookupError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: STATUS_BY_KIND[err.kind] ?? 502 },
      );
    }
    // Never log the address itself; only the error class.
    console.error(
      `[roof] unexpected error: ${err instanceof Error ? err.name : "unknown"}`,
    );
    return NextResponse.json(
      { ok: false, error: "The roof lookup failed unexpectedly. Please try again." },
      { status: 502 },
    );
  }
}
