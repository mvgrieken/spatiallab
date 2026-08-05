import { z } from "zod";

import {
  base64JpegSchema,
  clamp01,
  clampFrameIndex,
  confidenceSchema,
  markerSchema,
  MAX_FRAMES,
  MAX_LANGUAGE_LENGTH,
  MIN_FRAMES,
} from "@/lib/validation/schemas";
import { SPOT_GOALS } from "@/types/spot";

/**
 * Validation + controlled repair for experiment #002 — Find the Best Spot.
 * Shares the primitives (marker, confidence, clamps, frame limits) with #001.
 */

export const MAX_SPOTS = 3;
export const MAX_GOALS_PER_SCAN = 3;

export const spotRequestSchema = z.object({
  frames: z.array(base64JpegSchema).min(MIN_FRAMES).max(MAX_FRAMES),
  goal: z.enum(SPOT_GOALS),
  /** 1-based index of this goal analysis within the scan; max 3. */
  goalCount: z.number().int().min(1).max(MAX_GOALS_PER_SCAN),
  language: z.string().max(MAX_LANGUAGE_LENGTH).optional(),
});

export type SpotRequest = z.infer<typeof spotRequestSchema>;

export const spotSuggestionSchema = z.object({
  rank: z.number().int().min(1).max(MAX_SPOTS),
  title: z.string().min(1).max(120),
  reasoning: z.string().min(1).max(700),
  visibleEvidence: z.string().min(1).max(400),
  tradeoff: z.string().max(400).optional(),
  confidence: confidenceSchema,
  frameIndex: z.number().int().min(0),
  marker: markerSchema.optional(),
});

export const spotAvoidSchema = z.object({
  title: z.string().min(1).max(120),
  reason: z.string().min(1).max(400),
  frameIndex: z.number().int().min(0),
  marker: markerSchema.optional(),
});

export const spotAnalysisSchema = z.object({
  goal: z.string().min(1).max(60),
  summary: z.string().min(1).max(600),
  spots: z.array(spotSuggestionSchema).min(1).max(MAX_SPOTS),
  avoid: spotAvoidSchema.optional(),
  limitations: z.array(z.string().min(1).max(300)).max(5),
});

// ---------------------------------------------------------------------------
// Controlled repair — applied at most once before giving up
// ---------------------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function repairMarker(value: unknown): { x: number; y: number } | undefined {
  if (!isRecord(value)) return undefined;
  const { x, y } = value;
  if (typeof x !== "number" || typeof y !== "number") return undefined;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { x: clamp01(x), y: clamp01(y) };
}

/**
 * Repairs the failure modes observed in the spike: more than three spots,
 * spots without usable text, duplicate/gapped ranks, out-of-range markers
 * and frame indices. Drops unusable spots instead of failing the whole
 * analysis; ranks are re-numbered sequentially in the model's order.
 */
export function repairSpotAnalysis(raw: unknown, frameCount: number): unknown {
  if (!isRecord(raw)) return raw;
  const out: Record<string, unknown> = { ...raw };

  if (Array.isArray(out.spots)) {
    const usable = out.spots
      .filter(
        (s): s is Record<string, unknown> =>
          isRecord(s) &&
          typeof s.title === "string" &&
          s.title.trim().length > 0 &&
          typeof s.reasoning === "string" &&
          s.reasoning.trim().length > 0,
      )
      .slice(0, MAX_SPOTS)
      .map((s, i) => {
        const spot: Record<string, unknown> = { ...s, rank: i + 1 };
        if (typeof spot.frameIndex === "number") {
          spot.frameIndex = clampFrameIndex(spot.frameIndex, frameCount);
        }
        const marker = repairMarker(spot.marker);
        if (marker) spot.marker = marker;
        else delete spot.marker;
        if (typeof spot.tradeoff === "string" && spot.tradeoff.trim() === "") {
          delete spot.tradeoff;
        }
        return spot;
      });
    out.spots = usable;
  }

  if (isRecord(out.avoid)) {
    const avoid: Record<string, unknown> = { ...out.avoid };
    if (typeof avoid.frameIndex === "number") {
      avoid.frameIndex = clampFrameIndex(avoid.frameIndex, frameCount);
    }
    const marker = repairMarker(avoid.marker);
    if (marker) avoid.marker = marker;
    else delete avoid.marker;
    if (
      typeof avoid.title !== "string" ||
      avoid.title.trim() === "" ||
      typeof avoid.reason !== "string" ||
      avoid.reason.trim() === ""
    ) {
      delete out.avoid;
    } else {
      out.avoid = avoid;
    }
  } else {
    delete out.avoid;
  }

  if (Array.isArray(out.limitations)) {
    out.limitations = out.limitations.slice(0, 5);
  }
  return out;
}
