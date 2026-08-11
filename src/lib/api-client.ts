"use client";

import type {
  AnalyzeResponse,
  AskResponse,
  CapturedFrame,
} from "@/types/room";
import type { RoofResponse } from "@/types/roof";
import type { SpotGoal, SpotResponse } from "@/types/spot";

/**
 * Client-side API access shared by all experiments: one fetch wrapper with a
 * hard timeout, JSON handling and a friendly failure path. Experiments add
 * thin typed calls on top instead of hand-rolling fetch logic.
 */

const REQUEST_TIMEOUT_MS = 170_000;

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as T | null;
    if (!json) {
      throw new Error("The server returned an unexpected response.");
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

export function browserLanguage(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  return navigator.language || undefined;
}

// --- Experiment #001: Ask Your Room -------------------------------------

export function analyzeRoomRequest(
  frames: CapturedFrame[],
): Promise<AnalyzeResponse> {
  return postJson<AnalyzeResponse>("/api/room/analyze", {
    frames: frames.map((f) => f.base64),
    language: browserLanguage(),
  });
}

// --- Experiment #004: Solar Roof ----------------------------------------

/** POST, not GET: the address must stay out of the URL and therefore out of
 *  the platform's request logs. */
export function analyzeRoofRequest(query: string): Promise<RoofResponse> {
  return postJson<RoofResponse>("/api/roof/analyze", { q: query });
}

// --- Experiment #002: Find the Best Spot --------------------------------

export function findSpotsRequest(
  frames: CapturedFrame[],
  goal: SpotGoal,
  goalCount: number,
): Promise<SpotResponse> {
  return postJson<SpotResponse>("/api/spots/analyze", {
    frames: frames.map((f) => f.base64),
    goal,
    goalCount,
    language: browserLanguage(),
  });
}

export function askRoomRequest(
  frames: CapturedFrame[],
  question: string,
  questionCount: number,
  summary?: string,
): Promise<AskResponse> {
  return postJson<AskResponse>("/api/room/ask", {
    frames: frames.map((f) => f.base64),
    question,
    questionCount,
    language: browserLanguage(),
    summary,
  });
}
