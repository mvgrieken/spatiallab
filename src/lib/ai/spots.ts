import "server-only";

import { runVisionTask } from "@/lib/ai/client";
import {
  buildSpotSystemPrompt,
  buildSpotUserText,
} from "@/lib/ai/prompts/find-the-best-spot";
import {
  repairSpotAnalysis,
  spotAnalysisSchema,
} from "@/lib/validation/spot-schemas";
import type { SpotAnalysis, SpotGoal } from "@/types/spot";

/**
 * Experiment #002 — Find the Best Spot: one AI task via the shared runner.
 * JSON Schema mirrors the Zod schema minus range constraints (enforced by
 * Zod + repair afterwards).
 */

const markerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["x", "y"],
  properties: { x: { type: "number" }, y: { type: "number" } },
} as const;

const spotJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["rank", "title", "reasoning", "visibleEvidence", "confidence", "frameIndex"],
  properties: {
    rank: { type: "integer" },
    title: { type: "string" },
    reasoning: { type: "string" },
    visibleEvidence: { type: "string" },
    tradeoff: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    frameIndex: { type: "integer" },
    marker: markerJsonSchema,
  },
} as const;

const spotAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["goal", "summary", "spots", "limitations"],
  properties: {
    goal: { type: "string" },
    summary: { type: "string" },
    spots: { type: "array", items: spotJsonSchema },
    avoid: {
      type: "object",
      additionalProperties: false,
      required: ["title", "reason", "frameIndex"],
      properties: {
        title: { type: "string" },
        reason: { type: "string" },
        frameIndex: { type: "integer" },
        marker: markerJsonSchema,
      },
    },
    limitations: { type: "array", items: { type: "string" } },
  },
} as const;

export async function findSpots(
  frames: string[],
  goal: SpotGoal,
  language?: string,
): Promise<SpotAnalysis> {
  return runVisionTask({
    system: buildSpotSystemPrompt(language),
    userText: buildSpotUserText(goal),
    frames,
    jsonSchema: spotAnalysisJsonSchema as unknown as Record<string, unknown>,
    schema: spotAnalysisSchema,
    repair: repairSpotAnalysis,
  });
}
