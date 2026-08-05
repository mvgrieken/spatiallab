import { NextRequest, NextResponse } from "next/server";

import { RoomAiError } from "@/lib/ai/client";
import { analyzeRoom } from "@/lib/ai/room";
import { mockAnalysis } from "@/lib/ai/mock";
import { isMockMode } from "@/lib/config";
import { readJsonBody, roomErrorResponse } from "@/lib/api";
import { analyzeRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = analyzeRequestSchema.safeParse(body.json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request. Please rescan and try again." },
      { status: 400 },
    );
  }

  const { frames, language } = parsed.data;

  if (isMockMode()) {
    return NextResponse.json({
      ok: true,
      analysis: mockAnalysis(frames.length),
      mock: true,
    });
  }

  try {
    const analysis = await analyzeRoom(frames, language);
    return NextResponse.json({ ok: true, analysis, mock: false });
  } catch (err) {
    return roomErrorResponse(err instanceof RoomAiError ? err : undefined);
  }
}
