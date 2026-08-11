import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  allowWrite,
  clientHash,
  recordVote,
  requestIp,
} from "@/lib/store/counters";

export const runtime = "nodejs";

/**
 * One anonymous tap: "the answer was right" or "it wasn't".
 *
 * The response is always `{ ok: true }`, whatever happens underneath — a
 * dropped vote is SpatialLab's problem, never the visitor's. The endpoint
 * stores no reference to the answer, the question or the images; it moves one
 * of two site-wide integers.
 */

const MAX_WRITES_PER_HOUR = 20;

const bodySchema = z.object({ vote: z.enum(["correct", "incorrect"]) });

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const hash = clientHash(requestIp(request.headers));
  if (await allowWrite(hash, MAX_WRITES_PER_HOUR)) {
    await recordVote(parsed.data.vote, hash);
  }

  // Same answer for a stored vote, a duplicate, a rate-limited client and an
  // unreachable store: there is nothing here worth telling a visitor about.
  return NextResponse.json({ ok: true });
}
