"use client";

import { useCallback, useEffect, useState } from "react";

import { CameraScan } from "@/components/capture/CameraScan";
import { PhotoUpload } from "@/components/capture/PhotoUpload";
import { SpotResult } from "@/components/experiments/find-the-best-spot/SpotResult";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { AnalysisSteps } from "@/components/shared/Progress";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { trackEvent } from "@/lib/analytics/events";
import { findSpotsRequest } from "@/lib/api-client";
import { toDataUrl } from "@/lib/camera/frames";
import { bumpSessionCount, readSessionCount } from "@/lib/session-limits";
import { MAX_GOALS_PER_SCAN } from "@/lib/validation/spot-schemas";
import type { CapturedFrame } from "@/types/room";
import type { SpotAnalysis, SpotGoal } from "@/types/spot";
import { SPOT_GOAL_LABELS, SPOT_GOALS } from "@/types/spot";

type Phase =
  | { name: "intro" }
  | { name: "camera" }
  | { name: "upload" }
  | { name: "goals" }
  | { name: "analyzing"; goal: SpotGoal }
  | { name: "result"; goal: SpotGoal; analysis: SpotAnalysis; mock: boolean }
  | { name: "error"; message: string; goal?: SpotGoal };

/** Session-wide cost guard: max 9 goal analyses per browser session. */
const SESSION_GOAL_CAP = 9;
const SESSION_GOAL_KEY = "sl_spot_total";

const ANALYSIS_STEPS = [
  "Preparing selected views",
  "Sending frames for analysis",
  "Weighing visible spots against your goal",
  "Ranking the best places",
];

/**
 * Experiment #002 orchestrator: scan once, then have the AI weigh ranked
 * placement spots for up to three different goals on the same frames.
 */
export function FindBestSpot() {
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [usedGoals, setUsedGoals] = useState<SpotGoal[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

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

  const onFrames = useCallback((captured: CapturedFrame[]) => {
    setFrames(captured);
    setUsedGoals([]);
    setPhase({ name: "goals" });
  }, []);

  const analyzeGoal = useCallback(
    async (goal: SpotGoal, captured: CapturedFrame[], used: SpotGoal[]) => {
      if (readSessionCount(SESSION_GOAL_KEY) >= SESSION_GOAL_CAP) {
        setPhase({
          name: "error",
          message:
            "You've reached the analysis limit for this browser session. Come back later to keep exploring.",
        });
        return;
      }
      setStepIndex(0);
      setPhase({ name: "analyzing", goal });
      try {
        const json = await findSpotsRequest(captured, goal, used.length + 1);
        if (!json.ok) {
          setPhase({ name: "error", message: json.error, goal });
          return;
        }
        trackEvent("analysis_completed");
        if (used.length === 0) trackEvent("experiment_completed");
        bumpSessionCount(SESSION_GOAL_KEY);
        setUsedGoals((cur) => (cur.includes(goal) ? cur : [...cur, goal]));
        setPhase({ name: "result", goal, analysis: json.analysis, mock: json.mock });
      } catch {
        setPhase({
          name: "error",
          message:
            "The analysis took too long or the connection dropped. Please try again.",
          goal,
        });
      }
    },
    [],
  );

  const restart = useCallback(() => {
    setFrames([]);
    setUsedGoals([]);
    setPhase({ name: "intro" });
  }, []);

  const frameUrls = frames.map(toDataUrl);
  const goalsLeft = MAX_GOALS_PER_SCAN - usedGoals.length;

  return (
    <div>
      {phase.name === "intro" && (
        <div>
          <Panel>
            <p className="text-[15px] leading-relaxed text-muted">
              Scan your room once, then pick a goal — a desk, a TV, a plant.
              The AI weighs the visible options and marks the best spot on a
              frame of your own room, with an alternative, the honest
              trade-offs, and one place to avoid.
            </p>
            <div className="mt-5 flex flex-wrap gap-2" aria-hidden>
              {SPOT_GOALS.map((g) => (
                <span
                  key={g}
                  className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-muted"
                >
                  {SPOT_GOAL_LABELS[g]}
                </span>
              ))}
            </div>
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
          onFrames={onFrames}
          onCancel={restart}
          onFallbackToUpload={() => setPhase({ name: "upload" })}
        />
      )}

      {phase.name === "upload" && (
        <PhotoUpload onFrames={onFrames} onBack={restart} />
      )}

      {phase.name === "goals" && (
        <Panel>
          <p className="lab-label">
            {usedGoals.length === 0 ? "Scan complete" : "Same scan, new goal"}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            What are you looking for a spot for?
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {SPOT_GOALS.map((g) => (
              <Button
                key={g}
                variant="secondary"
                disabled={usedGoals.includes(g)}
                onClick={() => analyzeGoal(g, frames, usedGoals)}
              >
                {SPOT_GOAL_LABELS[g]}
                {usedGoals.includes(g) ? " ✓" : ""}
              </Button>
            ))}
          </div>
          <p className="mt-4 text-xs text-faint">
            {goalsLeft} goal {goalsLeft === 1 ? "analysis" : "analyses"} left
            for this scan.
          </p>
          <Button variant="ghost" className="mt-4 w-full" onClick={restart}>
            Scan another room
          </Button>
        </Panel>
      )}

      {phase.name === "analyzing" && (
        <Panel>
          <AnalysisSteps
            steps={ANALYSIS_STEPS}
            activeIndex={stepIndex}
            note={`Finding the best spot for: ${SPOT_GOAL_LABELS[phase.goal]}. This usually takes under a minute.`}
          />
        </Panel>
      )}

      {phase.name === "result" && (
        <SpotResult
          analysis={phase.analysis}
          goal={phase.goal}
          frameUrls={frameUrls}
          mock={phase.mock}
          remainingGoals={goalsLeft}
          onTryAnotherGoal={() => setPhase({ name: "goals" })}
          onRestart={restart}
        />
      )}

      {phase.name === "error" && (
        <ErrorPanel
          title="Something went wrong"
          message={phase.message}
          actions={[
            ...(phase.goal && frames.length > 0
              ? [
                  {
                    label: "Try this goal again",
                    onClick: () => analyzeGoal(phase.goal!, frames, usedGoals),
                  },
                ]
              : []),
            ...(frames.length > 0
              ? [
                  {
                    label: "Pick a different goal",
                    onClick: () => setPhase({ name: "goals" }),
                    variant: "secondary" as const,
                  },
                ]
              : []),
            { label: "Start over", onClick: restart, variant: "ghost" as const },
          ]}
        />
      )}
    </div>
  );
}
