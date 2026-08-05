import "server-only";

import { runVisionTask } from "@/lib/ai/client";
import {
  ANALYSIS_USER_TEXT,
  buildAnalysisSystemPrompt,
  buildAnswerSystemPrompt,
  buildQuestionUserText,
} from "@/lib/ai/prompts/ask-your-room";
import {
  repairAnalysis,
  repairAnswer,
  roomAnalysisSchema,
  roomAnswerSchema,
} from "@/lib/validation/schemas";
import type { RoomAnalysis, RoomAnswer } from "@/types/room";

/**
 * Experiment #001 — Ask Your Room: the two AI tasks, expressed as thin
 * configurations of the shared vision runner.
 *
 * The hand-written JSON Schemas mirror the Zod schemas minus the numeric
 * range constraints (the provider's structured-output subset doesn't support
 * them); ranges are enforced afterwards by Zod + the repair pass.
 */

const markerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["x", "y"],
  properties: { x: { type: "number" }, y: { type: "number" } },
} as const;

const observationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "title",
    "explanation",
    "visibleEvidence",
    "confidence",
    "frameIndex",
  ],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    explanation: { type: "string" },
    visibleEvidence: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    frameIndex: { type: "integer" },
    marker: markerJsonSchema,
  },
} as const;

const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["shortSummary", "observations", "suggestedQuestions", "limitations"],
  properties: {
    shortSummary: { type: "string" },
    observations: { type: "array", items: observationJsonSchema },
    suggestedQuestions: { type: "array", items: { type: "string" } },
    limitations: { type: "array", items: { type: "string" } },
  },
} as const;

const answerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "shortAnswer",
    "reasoning",
    "visibleEvidence",
    "confidence",
    "frameIndex",
  ],
  properties: {
    shortAnswer: { type: "string" },
    reasoning: { type: "string" },
    visibleEvidence: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    frameIndex: { type: "integer" },
    marker: markerJsonSchema,
    limitation: { type: "string" },
  },
} as const;

export async function analyzeRoom(
  frames: string[],
  language?: string,
): Promise<RoomAnalysis> {
  return runVisionTask({
    system: buildAnalysisSystemPrompt(language),
    userText: ANALYSIS_USER_TEXT,
    frames,
    jsonSchema: analysisJsonSchema as unknown as Record<string, unknown>,
    schema: roomAnalysisSchema,
    repair: repairAnalysis,
  });
}

export async function askRoom(
  frames: string[],
  question: string,
  options: { language?: string; summary?: string } = {},
): Promise<RoomAnswer> {
  return runVisionTask({
    system: buildAnswerSystemPrompt(options.language),
    userText: buildQuestionUserText(question, options.summary),
    frames,
    jsonSchema: answerJsonSchema as unknown as Record<string, unknown>,
    schema: roomAnswerSchema,
    repair: repairAnswer,
  });
}
