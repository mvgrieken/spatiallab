import { describe, expect, it } from "vitest";

import {
  repairSpotAnalysis,
  spotAnalysisSchema,
  spotRequestSchema,
} from "./spot-schemas";

const validBase64 = "A".repeat(200);

const validSpot = {
  rank: 1,
  title: "Next to the window",
  reasoning: "Only visible daylight in the sweep; the wall below is free.",
  visibleEvidence: "Window on the left in frame 0.",
  tradeoff: "Radiator underneath limits depth.",
  confidence: "medium",
  frameIndex: 0,
  marker: { x: 0.3, y: 0.5 },
};

const validAnalysis = {
  goal: "desk",
  summary: "The window wall wins on daylight.",
  spots: [validSpot],
  avoid: {
    title: "In front of the doorway",
    reason: "Blocks the visible walking route.",
    frameIndex: 1,
    marker: { x: 0.8, y: 0.6 },
  },
  limitations: ["Only two walls are visible."],
};

describe("spotRequestSchema", () => {
  it("accepts a valid request", () => {
    expect(
      spotRequestSchema.safeParse({
        frames: [validBase64],
        goal: "desk",
        goalCount: 1,
        language: "nl-NL",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown goals and a fourth goal", () => {
    const base = { frames: [validBase64], goalCount: 1 };
    expect(
      spotRequestSchema.safeParse({ ...base, goal: "swimming-pool" }).success,
    ).toBe(false);
    expect(
      spotRequestSchema.safeParse({ ...base, goal: "desk", goalCount: 4 })
        .success,
    ).toBe(false);
  });
});

describe("spotAnalysisSchema", () => {
  it("accepts a valid analysis (avoid optional)", () => {
    expect(spotAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
    const noAvoid = { ...validAnalysis };
    delete (noAvoid as Record<string, unknown>).avoid;
    expect(spotAnalysisSchema.safeParse(noAvoid).success).toBe(true);
  });

  it("rejects zero spots and more than three spots", () => {
    expect(
      spotAnalysisSchema.safeParse({ ...validAnalysis, spots: [] }).success,
    ).toBe(false);
    const four = Array.from({ length: 4 }, (_, i) => ({
      ...validSpot,
      rank: i + 1,
    }));
    expect(
      spotAnalysisSchema.safeParse({ ...validAnalysis, spots: four }).success,
    ).toBe(false);
  });
});

describe("repairSpotAnalysis (spike failure modes)", () => {
  it("drops empty placeholder spots and slices to three", () => {
    const broken = {
      ...validAnalysis,
      spots: [
        validSpot,
        { ...validSpot, rank: 2, title: "Wall" },
        { ...validSpot, rank: 3, title: "Corner" },
        { ...validSpot, rank: 4, title: "By the door", reasoning: "" },
      ],
    };
    const repaired = spotAnalysisSchema.parse(repairSpotAnalysis(broken, 2));
    expect(repaired.spots).toHaveLength(3);
    expect(repaired.spots.map((s) => s.rank)).toEqual([1, 2, 3]);
  });

  it("renumbers duplicate or gapped ranks in model order", () => {
    const broken = {
      ...validAnalysis,
      spots: [
        { ...validSpot, rank: 2 },
        { ...validSpot, rank: 2, title: "Wall" },
      ],
    };
    const repaired = spotAnalysisSchema.parse(repairSpotAnalysis(broken, 2));
    expect(repaired.spots.map((s) => s.rank)).toEqual([1, 2]);
  });

  it("clamps markers and frame indices; drops broken avoid", () => {
    const broken = {
      ...validAnalysis,
      spots: [
        { ...validSpot, frameIndex: 9, marker: { x: 1.7, y: -0.4 } },
      ],
      avoid: { title: "", reason: "", frameIndex: 0 },
    };
    const repaired = spotAnalysisSchema.parse(repairSpotAnalysis(broken, 3));
    expect(repaired.spots[0].frameIndex).toBe(2);
    expect(repaired.spots[0].marker).toEqual({ x: 1, y: 0 });
    expect(repaired.avoid).toBeUndefined();
  });

  it("removes empty tradeoff strings", () => {
    const broken = {
      ...validAnalysis,
      spots: [{ ...validSpot, tradeoff: "" }],
    };
    const repaired = spotAnalysisSchema.parse(repairSpotAnalysis(broken, 2));
    expect(repaired.spots[0].tradeoff).toBeUndefined();
  });

  it("leaves hopeless output invalid", () => {
    expect(
      spotAnalysisSchema.safeParse(repairSpotAnalysis({ nonsense: true }, 2))
        .success,
    ).toBe(false);
  });
});
