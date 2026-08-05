import { z } from "zod";

/**
 * Runtime validation for everything that crosses a trust boundary:
 * - request bodies arriving at the API routes;
 * - model output coming back from the AI provider.
 *
 * Model output is never trusted as-is: it is parsed, validated and — when
 * needed — repaired exactly once (clamping coordinates, slicing arrays)
 * before being rejected.
 */

export const MAX_FRAMES = 8;
export const MIN_FRAMES = 1;
export const MAX_QUESTIONS = 3;
export const MAX_QUESTION_LENGTH = 400;
export const MAX_LANGUAGE_LENGTH = 35;
/** Per-frame base64 budget (~1.6 MB binary → ~2.2 M base64 chars). */
export const MAX_FRAME_BASE64_LENGTH = 2_200_000;
/** Whole-request JSON budget in bytes. Vercel caps request bodies at ~4.5 MB. */
export const MAX_REQUEST_BYTES = 4_200_000;

export const base64JpegSchema = z
  .string()
  .min(100)
  .max(MAX_FRAME_BASE64_LENGTH)
  .regex(/^[A-Za-z0-9+/=]+$/, "frames must be raw base64 (no data: prefix)");

const base64Jpeg = base64JpegSchema;

export const analyzeRequestSchema = z.object({
  frames: z.array(base64Jpeg).min(MIN_FRAMES).max(MAX_FRAMES),
  language: z.string().max(MAX_LANGUAGE_LENGTH).optional(),
});

export const askRequestSchema = z.object({
  frames: z.array(base64Jpeg).min(MIN_FRAMES).max(MAX_FRAMES),
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
  /** 1-based index of this question within the session; max 3. */
  questionCount: z.number().int().min(1).max(MAX_QUESTIONS),
  language: z.string().max(MAX_LANGUAGE_LENGTH).optional(),
  /** Short summary from the initial analysis, for continuity. */
  summary: z.string().max(1_000).optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type AskRequest = z.infer<typeof askRequestSchema>;

// ---------------------------------------------------------------------------
// Model output schemas
// ---------------------------------------------------------------------------

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const markerSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const roomObservationSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(120),
  explanation: z.string().min(1).max(600),
  visibleEvidence: z.string().min(1).max(400),
  confidence: confidenceSchema,
  frameIndex: z.number().int().min(0),
  marker: markerSchema.optional(),
});

export const roomAnalysisSchema = z.object({
  shortSummary: z.string().min(1).max(600),
  observations: z.array(roomObservationSchema).min(1).max(3),
  suggestedQuestions: z.array(z.string().min(1).max(160)).max(3),
  limitations: z.array(z.string().min(1).max(300)).max(5),
});

export const roomAnswerSchema = z.object({
  shortAnswer: z.string().min(1).max(280),
  reasoning: z.string().min(1).max(700),
  visibleEvidence: z.string().min(1).max(400),
  confidence: confidenceSchema,
  frameIndex: z.number().int().min(0),
  marker: markerSchema.optional(),
  limitation: z.string().max(400).optional(),
});

// ---------------------------------------------------------------------------
// Controlled repair — applied at most once before giving up
// ---------------------------------------------------------------------------

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export const clampFrameIndex = (index: number, frameCount: number): number => {
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.round(index)), Math.max(0, frameCount - 1));
};

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
 * Best-effort repair of a RoomAnalysis-shaped object: clamps coordinates and
 * frame indices, truncates over-long arrays, drops unusable markers. Returns
 * the repaired object for re-validation — it does NOT guarantee validity.
 */
export function repairAnalysis(raw: unknown, frameCount: number): unknown {
  if (!isRecord(raw)) return raw;
  const out: Record<string, unknown> = { ...raw };
  if (Array.isArray(out.observations)) {
    out.observations = out.observations.slice(0, 3).map((obs, i) => {
      if (!isRecord(obs)) return obs;
      const o: Record<string, unknown> = { ...obs };
      if (typeof o.id !== "string" || o.id.length === 0) o.id = `obs-${i + 1}`;
      if (typeof o.frameIndex === "number") {
        o.frameIndex = clampFrameIndex(o.frameIndex, frameCount);
      }
      const marker = repairMarker(o.marker);
      if (marker) o.marker = marker;
      else delete o.marker;
      return o;
    });
  }
  if (Array.isArray(out.suggestedQuestions)) {
    out.suggestedQuestions = out.suggestedQuestions.slice(0, 3);
  }
  if (Array.isArray(out.limitations)) {
    out.limitations = out.limitations.slice(0, 5);
  }
  return out;
}

/** Same idea as {@link repairAnalysis}, for a single RoomAnswer. */
export function repairAnswer(raw: unknown, frameCount: number): unknown {
  if (!isRecord(raw)) return raw;
  const out: Record<string, unknown> = { ...raw };
  if (typeof out.frameIndex === "number") {
    out.frameIndex = clampFrameIndex(out.frameIndex, frameCount);
  }
  const marker = repairMarker(out.marker);
  if (marker) out.marker = marker;
  else delete out.marker;
  return out;
}
