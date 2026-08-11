import { NextRequest, NextResponse } from "next/server";

import { RoomAiError } from "@/lib/ai/client";
import { askRoom } from "@/lib/ai/room";
import { mockAnswer } from "@/lib/ai/mock";
import { isMockMode } from "@/lib/config";
import { budgetGuard, readJsonBody, roomErrorResponse } from "@/lib/api";
import { askRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = askRequestSchema.safeParse(body.json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid question request." },
      { status: 400 },
    );
  }

  const { frames, question, language, summary } = parsed.data;

  if (isMockMode()) {
    return NextResponse.json({
      ok: true,
      answer: mockAnswer(frames.length, question),
      mock: true,
    });
  }

  // Paid work starts here: count it against today's budget first.
  const overBudget = await budgetGuard();
  if (overBudget) return overBudget;

  try {
    const answer = await askRoom(frames, question, { language, summary });
    return NextResponse.json({ ok: true, answer, mock: false });
  } catch (err) {
    return roomErrorResponse(err instanceof RoomAiError ? err : undefined);
  }
}
