import type { RoomAnalysis, RoomAnswer } from "@/types/room";

/**
 * Development-only mock data. Served exclusively when `isMockMode()` is true,
 * which can never happen in a production build (see src/lib/config.ts).
 * Responses carry `mock: true` so the UI can show a visible badge.
 */

export function mockAnalysis(frameCount: number): RoomAnalysis {
  const last = Math.max(0, frameCount - 1);
  return {
    shortSummary:
      "A daylight room with a seating area near the window and an open walking route through the middle. (Mock data — no AI was called.)",
    observations: [
      {
        id: "obs-1",
        title: "Daylight corner near the window",
        explanation:
          "The area left of the window appears to receive the most daylight, although the camera angle makes the exact reach uncertain.",
        visibleEvidence: "Window with daylight on the left side of frame 0.",
        confidence: "medium",
        frameIndex: 0,
        marker: { x: 0.28, y: 0.42 },
      },
      {
        id: "obs-2",
        title: "Open floor area",
        explanation:
          "The centre of the room looks clear of furniture, keeping the walking route open.",
        visibleEvidence: `Uncluttered floor visible in frame ${Math.min(1, last)}.`,
        confidence: "medium",
        frameIndex: Math.min(1, last),
        marker: { x: 0.5, y: 0.72 },
      },
      {
        id: "obs-3",
        title: "Wall with free space",
        explanation:
          "One longer wall appears mostly free, which visually leaves room for furniture placement.",
        visibleEvidence: `Mostly empty wall in frame ${last}.`,
        confidence: "low",
        frameIndex: last,
      },
    ],
    suggestedQuestions: [
      "Where could I place a desk?",
      "What stands out about this room?",
      "How could I improve the layout?",
    ],
    limitations: [
      "This is mock data shown because no API key is configured.",
      "Estimates only — nothing is measured.",
    ],
  };
}

export function mockAnswer(frameCount: number, question: string): RoomAnswer {
  return {
    shortAnswer: `Mock answer to: "${question.slice(0, 60)}" — the spot near the window looks most suitable.`,
    reasoning:
      "The area by the window appears to have free floor space and daylight. The camera angle makes depth hard to judge. This is mock data; no AI analysis was performed.",
    visibleEvidence: "Free floor area next to the window in frame 0.",
    confidence: "low",
    frameIndex: 0,
    marker: { x: 0.3, y: 0.5 },
    limitation: "Mock mode — configure ANTHROPIC_API_KEY for real analysis.",
  };
}
