import { describe, expect, it } from "vitest";

import {
  analyzeRequestSchema,
  askRequestSchema,
  clamp01,
  clampFrameIndex,
  markerSchema,
  repairAnalysis,
  repairAnswer,
  roomAnalysisSchema,
  roomAnswerSchema,
} from "./schemas";

const validBase64 = "A".repeat(200);

const validObservation = {
  id: "obs-1",
  title: "Daylight corner",
  explanation: "The corner near the window receives daylight.",
  visibleEvidence: "Window on the left in frame 0.",
  confidence: "medium",
  frameIndex: 0,
  marker: { x: 0.3, y: 0.4 },
};

const validAnalysis = {
  shortSummary: "A bright room.",
  observations: [validObservation],
  suggestedQuestions: ["Where could I place a desk?"],
  limitations: ["Single sweep only."],
};

const validAnswer = {
  shortAnswer: "Near the window.",
  reasoning: "There is free floor space next to the window.",
  visibleEvidence: "Free floor in frame 1.",
  confidence: "high",
  frameIndex: 1,
  marker: { x: 0.5, y: 0.5 },
};

describe("marker / coordinate validation", () => {
  it("accepts coordinates in [0,1]", () => {
    expect(markerSchema.safeParse({ x: 0, y: 1 }).success).toBe(true);
    expect(markerSchema.safeParse({ x: 0.5, y: 0.25 }).success).toBe(true);
  });

  it("rejects out-of-range or non-numeric coordinates", () => {
    expect(markerSchema.safeParse({ x: -0.1, y: 0.5 }).success).toBe(false);
    expect(markerSchema.safeParse({ x: 0.5, y: 1.2 }).success).toBe(false);
    expect(markerSchema.safeParse({ x: "0.5", y: 0.5 }).success).toBe(false);
    expect(markerSchema.safeParse({ x: NaN, y: 0.5 }).success).toBe(false);
  });

  it("clamp01 clamps into [0,1]", () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(7)).toBe(1);
  });

  it("clampFrameIndex clamps into valid frame range", () => {
    expect(clampFrameIndex(-1, 6)).toBe(0);
    expect(clampFrameIndex(2.4, 6)).toBe(2);
    expect(clampFrameIndex(99, 6)).toBe(5);
    expect(clampFrameIndex(NaN, 6)).toBe(0);
  });
});

describe("roomAnalysisSchema", () => {
  it("accepts a valid analysis", () => {
    expect(roomAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("rejects empty observations", () => {
    expect(
      roomAnalysisSchema.safeParse({ ...validAnalysis, observations: [] }).success,
    ).toBe(false);
  });

  it("rejects more than three observations", () => {
    const four = Array.from({ length: 4 }, (_, i) => ({
      ...validObservation,
      id: `obs-${i}`,
    }));
    expect(
      roomAnalysisSchema.safeParse({ ...validAnalysis, observations: four })
        .success,
    ).toBe(false);
  });

  it("rejects invalid confidence values", () => {
    const bad = {
      ...validAnalysis,
      observations: [{ ...validObservation, confidence: "certain" }],
    };
    expect(roomAnalysisSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects completely empty or non-object output", () => {
    expect(roomAnalysisSchema.safeParse(null).success).toBe(false);
    expect(roomAnalysisSchema.safeParse("").success).toBe(false);
    expect(roomAnalysisSchema.safeParse({}).success).toBe(false);
  });
});

describe("repairAnalysis", () => {
  it("clamps out-of-range markers and frame indices", () => {
    const broken = {
      ...validAnalysis,
      observations: [
        {
          ...validObservation,
          frameIndex: 42,
          marker: { x: 1.4, y: -0.2 },
        },
      ],
    };
    const repaired = roomAnalysisSchema.parse(repairAnalysis(broken, 6));
    expect(repaired.observations[0].frameIndex).toBe(5);
    expect(repaired.observations[0].marker).toEqual({ x: 1, y: 0 });
  });

  it("drops unusable markers instead of failing", () => {
    const broken = {
      ...validAnalysis,
      observations: [{ ...validObservation, marker: { x: "left", y: 0.2 } }],
    };
    const repaired = roomAnalysisSchema.parse(repairAnalysis(broken, 6));
    expect(repaired.observations[0].marker).toBeUndefined();
  });

  it("truncates over-long arrays to the allowed maximum", () => {
    const broken = {
      ...validAnalysis,
      observations: Array.from({ length: 5 }, (_, i) => ({
        ...validObservation,
        id: `obs-${i}`,
      })),
      suggestedQuestions: ["a?", "b?", "c?", "d?", "e?"],
    };
    const repaired = roomAnalysisSchema.parse(repairAnalysis(broken, 6));
    expect(repaired.observations).toHaveLength(3);
    expect(repaired.suggestedQuestions).toHaveLength(3);
  });

  it("leaves hopeless output invalid", () => {
    expect(
      roomAnalysisSchema.safeParse(repairAnalysis({ nonsense: true }, 6)).success,
    ).toBe(false);
  });
});

describe("roomAnswerSchema + repairAnswer", () => {
  it("accepts a valid answer", () => {
    expect(roomAnswerSchema.safeParse(validAnswer).success).toBe(true);
  });

  it("repairs an out-of-bounds frame index and marker", () => {
    const broken = { ...validAnswer, frameIndex: -2, marker: { x: 3, y: 0.5 } };
    const repaired = roomAnswerSchema.parse(repairAnswer(broken, 4));
    expect(repaired.frameIndex).toBe(0);
    expect(repaired.marker).toEqual({ x: 1, y: 0.5 });
  });
});

describe("request schemas", () => {
  it("accepts a valid analyze request", () => {
    expect(
      analyzeRequestSchema.safeParse({ frames: [validBase64], language: "nl-NL" })
        .success,
    ).toBe(true);
  });

  it("rejects too many frames", () => {
    expect(
      analyzeRequestSchema.safeParse({ frames: Array(9).fill(validBase64) })
        .success,
    ).toBe(false);
  });

  it("rejects data-URL prefixed frames", () => {
    expect(
      analyzeRequestSchema.safeParse({
        frames: [`data:image/jpeg;base64,${validBase64}`],
      }).success,
    ).toBe(false);
  });

  it("caps question length and count", () => {
    const base = { frames: [validBase64], question: "Where?", questionCount: 1 };
    expect(askRequestSchema.safeParse(base).success).toBe(true);
    expect(
      askRequestSchema.safeParse({ ...base, questionCount: 4 }).success,
    ).toBe(false);
    expect(
      askRequestSchema.safeParse({ ...base, question: "x".repeat(500) }).success,
    ).toBe(false);
    expect(
      askRequestSchema.safeParse({ ...base, question: "   " }).success,
    ).toBe(false);
  });
});
