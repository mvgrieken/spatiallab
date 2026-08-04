"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CameraScan } from "@/components/capture/CameraScan";
import { PhotoUpload } from "@/components/capture/PhotoUpload";
import { AskedQuestion, ResultView } from "@/components/room/ResultView";
import { trackEvent } from "@/lib/analytics/events";
import { toDataUrl } from "@/lib/camera/frames";
import { MAX_QUESTIONS } from "@/lib/validation/schemas";
import type {
  AnalyzeResponse,
  AskResponse,
  CapturedFrame,
  RoomAnalysis,
} from "@/types/room";

type Phase =
  | { name: "intro" }
  | { name: "camera" }
  | { name: "upload" }
  | { name: "analyzing" }
  | { name: "result"; analysis: RoomAnalysis; mock: boolean }
  | { name: "error"; message: string };

/**
 * Cost guard on top of the 3-questions-per-scan UI limit: a browser session
 * gets at most 9 questions in total (3 scans' worth), tracked in
 * sessionStorage so a page refresh doesn't reset it.
 */
const SESSION_QUESTION_CAP = 9;
const SESSION_QUESTION_KEY = "sl_q_total";

function readSessionQuestionTotal(): number {
  try {
    return Number(sessionStorage.getItem(SESSION_QUESTION_KEY)) || 0;
  } catch {
    return 0;
  }
}

function bumpSessionQuestionTotal(): void {
  try {
    sessionStorage.setItem(
      SESSION_QUESTION_KEY,
      String(readSessionQuestionTotal() + 1),
    );
  } catch {
    // Storage unavailable (private mode) — the per-scan limit still applies.
  }
}

const ANALYSIS_STEPS = [
  "Preparing selected views",
  "Sending frames for analysis",
  "Understanding visible objects and layout",
  "Preparing observations",
];

function browserLanguage(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  return navigator.language || undefined;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
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

/**
 * Orchestrates the whole experiment: intro → capture (camera or upload) →
 * analysis → annotated result with up to three follow-up questions.
 * All state lives in the browser for the duration of the session — nothing
 * is persisted anywhere.
 */
export function AskYourRoom() {
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [asked, setAsked] = useState<AskedQuestion[]>([]);
  const [askPending, setAskPending] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const completedRef = useRef(false);

  // Rotate honest status lines while the analysis request is in flight.
  // (stepIndex is reset to 0 in analyze() before entering this phase.)
  useEffect(() => {
    if (phase.name !== "analyzing") return;
    const t1 = setTimeout(() => setStepIndex(1), 900);
    const t2 = setTimeout(() => setStepIndex(2), 4500);
    const t3 = setTimeout(() => setStepIndex(3), 12_000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase.name]);

  const analyze = useCallback(async (captured: CapturedFrame[]) => {
    setFrames(captured);
    setAsked([]);
    setAskError(null);
    completedRef.current = false;
    setStepIndex(0);
    setPhase({ name: "analyzing" });
    try {
      const json = await postJson<AnalyzeResponse>("/api/room/analyze", {
        frames: captured.map((f) => f.base64),
        language: browserLanguage(),
      });
      if (!json.ok) {
        setPhase({ name: "error", message: json.error });
        return;
      }
      trackEvent("analysis_completed");
      setPhase({ name: "result", analysis: json.analysis, mock: json.mock });
    } catch {
      setPhase({
        name: "error",
        message:
          "The analysis took too long or the connection dropped. Please try again.",
      });
    }
  }, []);

  const ask = useCallback(
    async (question: string) => {
      if (phase.name !== "result" || askPending) return;
      if (asked.length >= MAX_QUESTIONS) return;
      if (readSessionQuestionTotal() >= SESSION_QUESTION_CAP) {
        setAskError(
          "You've reached the question limit for this browser session. Come back later to keep exploring.",
        );
        return;
      }
      setAskPending(true);
      setAskError(null);
      try {
        const json = await postJson<AskResponse>("/api/room/ask", {
          frames: frames.map((f) => f.base64),
          question,
          questionCount: asked.length + 1,
          language: browserLanguage(),
          summary: phase.analysis.shortSummary,
        });
        if (!json.ok) {
          setAskError(json.error);
          return;
        }
        trackEvent("question_asked");
        bumpSessionQuestionTotal();
        setAsked((cur) => {
          const next = [...cur, { question, answer: json.answer }];
          if (next.length >= MAX_QUESTIONS && !completedRef.current) {
            completedRef.current = true;
            trackEvent("experiment_completed");
          }
          return next;
        });
      } catch {
        setAskError("That question could not be analyzed. Please try again.");
      } finally {
        setAskPending(false);
      }
    },
    [asked.length, askPending, frames, phase],
  );

  const restart = useCallback(() => {
    setFrames([]);
    setAsked([]);
    setAskError(null);
    setPhase({ name: "intro" });
  }, []);

  const startCamera = useCallback(() => {
    trackEvent("experiment_started");
    setPhase({ name: "camera" });
  }, []);

  const frameUrls = frames.map(toDataUrl);

  return (
    <div>
      {phase.name === "intro" && (
        <div>
          <div className="border border-line bg-surface p-5 sm:p-7">
            <p className="text-[15px] leading-relaxed text-muted">
              Point your camera around the room for about ten seconds. The AI
              looks at a handful of frames and tells you what it sees — then
              you get three questions to ask about your own space.
            </p>

            {/* Miniature illustration of an annotated frame */}
            <svg
              viewBox="0 0 320 180"
              role="img"
              aria-label="Illustration: a room frame with an AI marker and note"
              className="mt-5 w-full border border-line"
            >
              <rect width="320" height="180" fill="var(--background)" />
              <path
                d="M0 128 L96 96 L320 118 M96 96 L96 22"
                stroke="var(--line)"
                strokeWidth="2"
                fill="none"
              />
              <rect x="150" y="60" width="52" height="40" fill="none" stroke="var(--faint)" strokeWidth="2" />
              <line x1="150" y1="80" x2="202" y2="80" stroke="var(--faint)" strokeWidth="2" />
              <rect x="236" y="86" width="56" height="26" fill="var(--line)" />
              <circle cx="176" cy="80" r="6" fill="var(--marker)" />
              <circle cx="176" cy="80" r="11" fill="none" stroke="var(--marker)" strokeWidth="1.5" opacity="0.5" />
              <line x1="176" y1="80" x2="216" y2="42" stroke="var(--marker)" strokeWidth="1.5" />
              <rect x="216" y="28" width="86" height="20" fill="var(--surface)" stroke="var(--line)" />
              <text
                x="224"
                y="42"
                fontFamily="var(--font-geist-mono), monospace"
                fontSize="10"
                fill="var(--foreground)"
              >
                Daylight here
              </text>
            </svg>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="min-h-13 bg-accent px-6 py-3.5 text-base font-medium text-accent-contrast transition-opacity hover:opacity-90"
              >
                Scan my room
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent("experiment_started");
                  setPhase({ name: "upload" });
                }}
                className="min-h-11 border border-line px-6 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
              >
                Upload photos instead
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            Selected frames are sent securely to the AI provider for analysis.
            SpatialLab does not store them in its own database. Estimates are
            not measurements or professional advice.
          </p>
        </div>
      )}

      {phase.name === "camera" && (
        <CameraScan
          onFrames={analyze}
          onCancel={restart}
          onFallbackToUpload={() => setPhase({ name: "upload" })}
        />
      )}

      {phase.name === "upload" && (
        <PhotoUpload onFrames={analyze} onBack={restart} />
      )}

      {phase.name === "analyzing" && (
        <div className="border border-line bg-surface p-5 sm:p-7" aria-live="polite">
          <p className="lab-label">Analyzing</p>
          <div className="relative mt-4 h-1 w-full overflow-hidden bg-line">
            <div className="scan-sweep absolute h-full w-1/4 bg-accent" />
          </div>
          <ol className="mt-5 space-y-2">
            {ANALYSIS_STEPS.map((step, i) => (
              <li
                key={step}
                className={`flex items-baseline gap-3 text-sm transition-colors ${
                  i === stepIndex
                    ? "text-foreground"
                    : i < stepIndex
                      ? "text-faint line-through decoration-line"
                      : "text-faint"
                }`}
              >
                <span className="font-mono text-xs">
                  {i < stepIndex ? "✓" : i === stepIndex ? "●" : "○"}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs text-faint">
            This usually takes under a minute.
          </p>
        </div>
      )}

      {phase.name === "result" && (
        <ResultView
          analysis={phase.analysis}
          frameUrls={frameUrls}
          mock={phase.mock}
          asked={asked}
          askPending={askPending}
          askError={askError}
          onAsk={ask}
          onRestart={restart}
        />
      )}

      {phase.name === "error" && (
        <div className="border border-line bg-surface p-5 sm:p-7">
          <p className="lab-label !text-accent">Something went wrong</p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            {phase.message}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {frames.length > 0 && (
              <button
                type="button"
                onClick={() => analyze(frames)}
                className="min-h-12 bg-accent px-6 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
              >
                Try the analysis again
              </button>
            )}
            <button
              type="button"
              onClick={restart}
              className="min-h-11 border border-line px-6 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
