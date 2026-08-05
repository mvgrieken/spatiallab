import { NextRequest, NextResponse } from "next/server";

import { RoomAiError } from "@/lib/ai/client";
import { mockSpotAnalysis } from "@/lib/ai/mock";
import { findSpots } from "@/lib/ai/spots";
import { isMockMode } from "@/lib/config";
import { readJsonBody, roomErrorResponse } from "@/lib/api";
import { spotRequestSchema } from "@/lib/validation/spot-schemas";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = spotRequestSchema.safeParse(body.json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request. Please rescan and try again." },
      { status: 400 },
    );
  }

  const { frames, goal, language } = parsed.data;

  if (isMockMode()) {
    return NextResponse.json({
      ok: true,
      analysis: mockSpotAnalysis(frames.length, goal),
      mock: true,
    });
  }

  try {
    const analysis = await findSpots(frames, goal, language);
    return NextResponse.json({ ok: true, analysis, mock: false });
  } catch (err) {
    return roomErrorResponse(err instanceof RoomAiError ? err : undefined);
  }
}
