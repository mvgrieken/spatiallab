import type { Confidence, Marker } from "@/types/room";

/**
 * Domain types for SpatialLab #002 — Find the Best Spot.
 * Zod schemas in `src/lib/validation/spot-schemas.ts` are the runtime truth.
 */

export const SPOT_GOALS = [
  "desk",
  "tv",
  "reading-chair",
  "plant",
  "play-area",
  "storage",
] as const;

export type SpotGoal = (typeof SPOT_GOALS)[number];

export const SPOT_GOAL_LABELS: Record<SpotGoal, string> = {
  desk: "Desk",
  tv: "TV",
  "reading-chair": "Reading chair",
  plant: "Plant",
  "play-area": "Play area",
  storage: "Storage",
};

export type SpotSuggestion = {
  /** 1 = best. Always sequential after validation. */
  rank: number;
  title: string;
  reasoning: string;
  visibleEvidence: string;
  /** The honest downside of this spot. */
  tradeoff?: string;
  confidence: Confidence;
  frameIndex: number;
  marker?: Marker;
};

export type SpotAvoid = {
  title: string;
  reason: string;
  frameIndex: number;
  marker?: Marker;
};

export type SpotAnalysis = {
  goal: string;
  summary: string;
  spots: SpotSuggestion[];
  avoid?: SpotAvoid;
  limitations: string[];
};

export type SpotResponse =
  | { ok: true; analysis: SpotAnalysis; mock: boolean }
  | { ok: false; error: string };
