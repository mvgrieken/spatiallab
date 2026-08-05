"use client";

import { AnnotatedFrame } from "@/components/shared/AnnotatedFrame";
import { Button } from "@/components/ui/Button";
import type { SpotAnalysis, SpotGoal } from "@/types/spot";
import { SPOT_GOAL_LABELS } from "@/types/spot";

type Props = {
  analysis: SpotAnalysis;
  goal: SpotGoal;
  frameUrls: string[];
  mock: boolean;
  remainingGoals: number;
  onTryAnotherGoal: () => void;
  onRestart: () => void;
};

/**
 * Ranked placement result: the best spot first, alternatives below, each
 * visually anchored to its frame, plus one honest place to avoid.
 */
export function SpotResult({
  analysis,
  goal,
  frameUrls,
  mock,
  remainingGoals,
  onTryAnotherGoal,
  onRestart,
}: Props) {
  return (
    <div className="space-y-10">
      {mock && (
        <p className="border border-accent bg-surface px-4 py-3 font-mono text-xs uppercase tracking-widest text-accent">
          Mock data — no AI was called (development mode)
        </p>
      )}

      <section>
        <p className="lab-label">Verdict · {SPOT_GOAL_LABELS[goal]}</p>
        <p className="mt-2 text-lg leading-snug">{analysis.summary}</p>
      </section>

      {analysis.spots.map((spot) => (
        <section key={spot.rank}>
          <p className="lab-label">
            <span className="font-mono !text-accent">{spot.rank}</span>
            {" · "}
            {spot.rank === 1 ? "Best spot" : "Alternative"}
          </p>
          <div className="mt-3 space-y-3">
            <AnnotatedFrame
              frameUrls={frameUrls}
              frameIndex={spot.frameIndex}
              marker={spot.marker}
              label={spot.title}
              confidence={spot.confidence}
            />
            <p className="text-[15px] leading-relaxed">{spot.reasoning}</p>
            <p className="text-sm text-muted">
              <span className="lab-label mr-2">Evidence</span>
              {spot.visibleEvidence}
            </p>
            {spot.tradeoff && (
              <p className="text-sm text-faint">
                <span className="lab-label mr-2">Trade-off</span>
                {spot.tradeoff}
              </p>
            )}
          </div>
        </section>
      ))}

      {analysis.avoid && (
        <section className="border-l-2 border-accent pl-4">
          <p className="lab-label !text-accent">Avoid</p>
          <p className="mt-1 text-sm font-medium">{analysis.avoid.title}</p>
          <p className="mt-1 text-sm text-muted">{analysis.avoid.reason}</p>
        </section>
      )}

      <section className="border-t border-line pt-6">
        {analysis.limitations.length > 0 && (
          <ul className="space-y-1">
            {analysis.limitations.map((l) => (
              <li key={l} className="text-xs text-faint">
                — {l}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-col gap-3">
          {remainingGoals > 0 && (
            <Button onClick={onTryAnotherGoal}>
              Try another goal ({remainingGoals} left for this scan)
            </Button>
          )}
          <Button variant="secondary" onClick={onRestart}>
            Scan another room
          </Button>
        </div>
      </section>
    </div>
  );
}
