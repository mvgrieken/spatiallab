import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getApiKey, getInferenceGeo, getModel } from "@/lib/config";
import {
  ANALYSIS_USER_TEXT,
  buildAnalysisSystemPrompt,
  buildAnswerSystemPrompt,
  buildQuestionUserText,
} from "@/lib/ai/prompts";
import {
  repairAnalysis,
  repairAnswer,
  roomAnalysisSchema,
  roomAnswerSchema,
} from "@/lib/validation/schemas";
import type { RoomAnalysis, RoomAnswer } from "@/types/room";

/**
 * Server-side AI provider. The API key never leaves this module; frames are
 * forwarded to the AI provider for analysis and are not stored or logged by
 * SpatialLab.
 */

export class RoomAiError extends Error {
  constructor(
    message: string,
    readonly kind: "config" | "refused" | "invalid_output" | "upstream",
  ) {
    super(message);
    this.name = "RoomAiError";
  }
}

function getClient(): Anthropic {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new RoomAiError("ANTHROPIC_API_KEY is not configured.", "config");
  }
  return new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 });
}

function imageBlocks(frames: string[]): Anthropic.ContentBlockParam[] {
  return frames.map((data) => ({
    type: "image" as const,
    source: { type: "base64" as const, media_type: "image/jpeg" as const, data },
  }));
}

// JSON Schemas for structured outputs. Numeric range constraints are not
// supported by the API's schema subset, so ranges (marker 0..1, frameIndex
// within bounds, array lengths) are enforced afterwards by Zod + repair.
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

async function callModel(
  system: string,
  content: Anthropic.ContentBlockParam[],
  schema: Record<string, unknown>,
): Promise<unknown> {
  const client = getClient();
  const inferenceGeo = getInferenceGeo();

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: getModel(),
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content }],
      output_config: { format: { type: "json_schema", schema } },
      ...(inferenceGeo ? { inference_geo: inferenceGeo } : {}),
    } as Anthropic.MessageCreateParamsNonStreaming);
  } catch (err) {
    // Never log request bodies (they contain image data); only the error class.
    console.error(
      `[room-ai] upstream error: ${err instanceof Error ? err.name : "unknown"}`,
    );
    throw new RoomAiError("The AI provider could not be reached.", "upstream");
  }

  if (response.stop_reason === "refusal") {
    throw new RoomAiError(
      "The AI declined to analyze these images.",
      "refused",
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new RoomAiError("The AI response was cut off.", "invalid_output");
  }

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) {
    throw new RoomAiError("The AI returned an empty response.", "invalid_output");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new RoomAiError("The AI returned unparseable output.", "invalid_output");
  }
}

export async function analyzeRoom(
  frames: string[],
  language?: string,
): Promise<RoomAnalysis> {
  const raw = await callModel(
    buildAnalysisSystemPrompt(language),
    [...imageBlocks(frames), { type: "text", text: ANALYSIS_USER_TEXT }],
    analysisJsonSchema as unknown as Record<string, unknown>,
  );

  const direct = roomAnalysisSchema.safeParse(raw);
  if (direct.success) return direct.data;

  // Single controlled repair (clamp coordinates/indices, slice arrays).
  const repaired = roomAnalysisSchema.safeParse(repairAnalysis(raw, frames.length));
  if (repaired.success) return repaired.data;

  console.error("[room-ai] analysis output failed validation after repair");
  throw new RoomAiError(
    "The AI produced an unusable analysis for these images.",
    "invalid_output",
  );
}

export async function askRoom(
  frames: string[],
  question: string,
  options: { language?: string; summary?: string } = {},
): Promise<RoomAnswer> {
  const raw = await callModel(
    buildAnswerSystemPrompt(options.language),
    [
      ...imageBlocks(frames),
      { type: "text", text: buildQuestionUserText(question, options.summary) },
    ],
    answerJsonSchema as unknown as Record<string, unknown>,
  );

  const direct = roomAnswerSchema.safeParse(raw);
  if (direct.success) return direct.data;

  const repaired = roomAnswerSchema.safeParse(repairAnswer(raw, frames.length));
  if (repaired.success) return repaired.data;

  console.error("[room-ai] answer output failed validation after repair");
  throw new RoomAiError(
    "The AI produced an unusable answer for this question.",
    "invalid_output",
  );
}
