import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

import { getApiKey, getEffort, getInferenceGeo, getModel } from "@/lib/config";

/**
 * The one place that talks to the AI provider. Every experiment goes through
 * `runVisionTask`: frames + prompt in, schema-validated typed output out —
 * with refusal handling, JSON parsing, Zod validation and exactly one
 * controlled repair pass. No Anthropic code lives anywhere else.
 *
 * The API key never leaves this module; frames are forwarded to the provider
 * for analysis and are never stored or logged by SpatialLab.
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
  // No SDK retry: a retried vision call doubles the wait past the route cap;
  // the user-facing retry button is the recovery path.
  return new Anthropic({ apiKey, timeout: 150_000, maxRetries: 0 });
}

function imageBlocks(frames: string[]): Anthropic.ContentBlockParam[] {
  return frames.map((data) => ({
    type: "image" as const,
    source: { type: "base64" as const, media_type: "image/jpeg" as const, data },
  }));
}

export type VisionTask<T> = {
  system: string;
  userText: string;
  frames: string[];
  /** JSON Schema for the provider's structured-output constraint. */
  jsonSchema: Record<string, unknown>;
  /** Zod schema — the source of truth for what reaches the app. */
  schema: ZodType<T>;
  /** Optional single controlled repair (clamp/truncate) before giving up. */
  repair?: (raw: unknown, frameCount: number) => unknown;
  maxTokens?: number;
};

export async function runVisionTask<T>(task: VisionTask<T>): Promise<T> {
  const client = getClient();
  const inferenceGeo = getInferenceGeo();

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: getModel(),
      max_tokens: task.maxTokens ?? 3000,
      system: task.system,
      messages: [
        {
          role: "user",
          content: [...imageBlocks(task.frames), { type: "text", text: task.userText }],
        },
      ],
      output_config: {
        effort: getEffort(),
        format: { type: "json_schema", schema: task.jsonSchema },
      },
      ...(inferenceGeo ? { inference_geo: inferenceGeo } : {}),
    } as Anthropic.MessageCreateParamsNonStreaming);
  } catch (err) {
    // Never log request bodies (they contain image data); only the error class.
    console.error(
      `[ai] upstream error: ${err instanceof Error ? err.name : "unknown"}`,
    );
    throw new RoomAiError("The AI provider could not be reached.", "upstream");
  }

  if (response.stop_reason === "refusal") {
    throw new RoomAiError("The AI declined to analyze these images.", "refused");
  }
  if (response.stop_reason === "max_tokens") {
    throw new RoomAiError("The AI response was cut off.", "invalid_output");
  }

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) {
    throw new RoomAiError("The AI returned an empty response.", "invalid_output");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new RoomAiError("The AI returned unparseable output.", "invalid_output");
  }

  const direct = task.schema.safeParse(raw);
  if (direct.success) return direct.data;

  if (task.repair) {
    const repaired = task.schema.safeParse(task.repair(raw, task.frames.length));
    if (repaired.success) return repaired.data;
  }

  console.error("[ai] output failed validation after repair");
  throw new RoomAiError(
    "The AI produced unusable output for these images.",
    "invalid_output",
  );
}
