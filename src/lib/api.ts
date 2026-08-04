import "server-only";

import { NextRequest, NextResponse } from "next/server";

import type { RoomAiError } from "@/lib/ai/anthropic";
import { MAX_REQUEST_BYTES } from "@/lib/validation/schemas";

/**
 * Shared helpers for the two API routes. Requests are size-capped before any
 * parsing; error responses never echo request contents.
 */

type BodyResult =
  | { ok: true; json: unknown }
  | { ok: false; response: NextResponse };

export async function readJsonBody(request: NextRequest): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_REQUEST_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Request too large. Fewer or smaller images, please." },
        { status: 413 },
      ),
    };
  }
  try {
    const text = await request.text();
    if (text.length > MAX_REQUEST_BYTES) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "Request too large. Fewer or smaller images, please." },
          { status: 413 },
        ),
      };
    }
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 },
      ),
    };
  }
}

export function roomErrorResponse(err?: RoomAiError): NextResponse {
  const kind = err?.kind ?? "upstream";
  const messages: Record<string, { status: number; error: string }> = {
    config: {
      status: 503,
      error:
        "This preview is not fully configured yet (missing AI credentials). Please try again later.",
    },
    refused: {
      status: 422,
      error:
        "The AI declined to analyze these images. Try a different room or angle.",
    },
    invalid_output: {
      status: 502,
      error:
        "The AI response could not be used this time. Please try again.",
    },
    upstream: {
      status: 502,
      error:
        "The analysis service is temporarily unavailable. Please try again in a moment.",
    },
  };
  const mapped = messages[kind];
  return NextResponse.json({ ok: false, error: mapped.error }, { status: mapped.status });
}
