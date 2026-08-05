"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CameraScan } from "@/components/capture/CameraScan";
import { PhotoUpload } from "@/components/capture/PhotoUpload";
import {
  AskedQuestion,
  ResultView,
} from "@/components/experiments/ask-your-room/ResultView";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { AnalysisSteps } from "@/components/shared/Progress";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { trackEvent } from "@/lib/analytics/events";
import { analyzeRoomRequest, askRoomRequest } from "@/lib/api-client";
import { toDataUrl } from "@/lib/camera/frames";
import { bumpSessionCount, readSessionCount } from "@/lib/session-limits";
import { MAX_QUESTIONS } from "@/lib/validation/schemas";
import type { CapturedFrame, RoomAnalysis } from "@/types/room";

type Phase =
  | { name: "intro" }
  | { name: "camera" }
  | { name: "upload" }
  | { name: "analyzing" }
  | { name: "result"; analysis: RoomAnalysis; mock: boolean }
  | { name: "error"; message: string };

/**
 * Cost guard on top of the 3-questions-per-scan UI limit: a browser session
 * gets at most 9 questions in total (3 scans' worth).
 */
const SESSION_QUESTION_CAP = 9;
const SESSION_QUESTION_KEY = "sl_q_total";

const ANALYSIS_STEPS = [
  "Preparing selected views",
  "Sending frames for analysis",
  "Understanding visible objects and layout",
  "Preparing observations",
];

/**
 * Experiment #001 orchestrator: intro → capture (camera or upload) →
 * analysis → annotated result with up to three follow-up questions.
 * All state lives in the browser for the duration of the session.
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
      const json = await analyzeRoomRequest(captured);
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
      if (readSessionCount(SESSION_QUESTION_KEY) >= SESSION_QUESTION_CAP) {
        setAskError(
          "You've reached the question limit for this browser session. Come back later to keep exploring.",
        );
        return;
      }
      setAskPending(true);
      setAskError(null);
      try {
        const json = await askRoomRequest(
          frames,
          question,
          asked.length + 1,
          phase.analysis.shortSummary,
        );
        if (!json.ok) {
          setAskError(json.error);
          return;
        }
        trackEvent("question_asked");
        bumpSessionCount(SESSION_QUESTION_KEY);
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

  const frameUrls = frames.map(toDataUrl);

  return (
    <div>
      {phase.name === "intro" && (
        <div>
          <Panel>
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
              <Button
                className="min-h-13 py-3.5 text-base"
                onClick={() => {
                  trackEvent("experiment_started");
                  setPhase({ name: "camera" });
                }}
              >
                Scan my room
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  trackEvent("experiment_started");
                  setPhase({ name: "upload" });
                }}
              >
                Upload photos instead
              </Button>
            </div>
          </Panel>
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
        <Panel>
          <AnalysisSteps
            steps={ANALYSIS_STEPS}
            activeIndex={stepIndex}
            note="This usually takes under a minute."
          />
        </Panel>
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
        <ErrorPanel
          title="Something went wrong"
          message={phase.message}
          actions={[
            ...(frames.length > 0
              ? [{ label: "Try the analysis again", onClick: () => analyze(frames) }]
              : []),
            { label: "Start over", onClick: restart, variant: "secondary" as const },
          ]}
        />
      )}
    </div>
  );
}
