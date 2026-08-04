/**
 * Shared domain types for SpatialLab #001 — Ask Your Room.
 *
 * These mirror the Zod schemas in `src/lib/validation/schemas.ts`.
 * The Zod schemas are the source of truth for runtime validation;
 * these types exist for ergonomic imports in UI code.
 */

export type Confidence = "high" | "medium" | "low";

export type Marker = {
  /** Horizontal position, 0..1, relative to frame width. */
  x: number;
  /** Vertical position, 0..1, relative to frame height. */
  y: number;
};

export type RoomObservation = {
  id: string;
  title: string;
  explanation: string;
  visibleEvidence: string;
  confidence: Confidence;
  frameIndex: number;
  marker?: Marker;
};

export type RoomAnalysis = {
  shortSummary: string;
  observations: RoomObservation[];
  suggestedQuestions: string[];
  limitations: string[];
};

export type RoomAnswer = {
  shortAnswer: string;
  reasoning: string;
  visibleEvidence: string;
  confidence: Confidence;
  frameIndex: number;
  marker?: Marker;
  limitation?: string;
};

/** A captured, downscaled JPEG frame as a raw base64 string (no data: prefix). */
export type CapturedFrame = {
  base64: string;
  /** Pixel dimensions after client-side downscaling. */
  width: number;
  height: number;
};

export type AnalyzeResponse =
  | { ok: true; analysis: RoomAnalysis; mock: boolean }
  | { ok: false; error: string };

export type AskResponse =
  | { ok: true; answer: RoomAnswer; mock: boolean }
  | { ok: false; error: string };
