import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isMockMode } from "@/lib/config";
import { mockRoofResult } from "@/lib/roof/mock";
import { analyzeRoofByAddress, RoofLookupError } from "@/lib/roof/pdok";
import { countError } from "@/lib/store/counters";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * The address travels in the request body, never in the query string: Vercel's
 * runtime logs record path and search params, so a `?q=<address>` would put
 * user addresses in infrastructure logs regardless of what this route logs.
 */
const bodySchema = z.object({ q: z.string().trim().min(3).max(120) });

const STATUS_BY_KIND: Record<string, number> = {
  address: 404,
  no_building: 404,
  no_roof: 422,
  upstream: 502,
};

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
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
    const result = await analyzeRoofByAddress(parsed.data.q);
    return NextResponse.json({ ok: true, result, mock: false });
  } catch (err) {
    if (err instanceof RoofLookupError) {
      // "no building here" is a normal answer, not an outage worth counting.
      if (err.kind === "upstream") await countError("geo_upstream");
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: STATUS_BY_KIND[err.kind] ?? 502 },
      );
    }
    await countError("geo_upstream");
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
