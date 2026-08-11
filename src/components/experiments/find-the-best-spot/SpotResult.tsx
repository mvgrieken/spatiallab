"use client";

import { AnnotatedFrame } from "@/components/shared/AnnotatedFrame";
import { AnswerFeedback } from "@/components/shared/AnswerFeedback";
import { ShareResult } from "@/components/shared/ShareResult";
import { CONFIDENCE_LABELS } from "@/components/shared/AnnotatedFrame";
import { loadImage } from "@/lib/share/card";
import { fitObjectForGoal } from "@/lib/deep-link";
import { FIT_OBJECT_SPECS } from "@/lib/fit/objects";
import Link from "next/link";
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
        <AnswerFeedback className="mb-6" />
        <ShareResult
          className="mb-6"
          filename="spatiallab-best-spot.png"
          buildSpec={async () => {
            // The top-ranked spot is the result worth sharing.
            const best = analysis.spots[0];
            if (!best) return null;
            const hero = await loadImage(
              frameUrls[Math.min(best.frameIndex, frameUrls.length - 1)] ?? "",
            );
            return {
              experiment: `#002 Find the Best Spot · ${SPOT_GOAL_LABELS[goal]}`,
              headline: best.title,
              detail: CONFIDENCE_LABELS[best.confidence],
              hero,
              heroSize: hero
                ? { width: hero.naturalWidth, height: hero.naturalHeight }
                : undefined,
              marker: best.marker,
            };
          }}
        />
        {analysis.limitations.length > 0 && (
          <ul className="space-y-1">
            {analysis.limitations.map((l) => (
              <li key={l} className="text-xs text-faint">
                — {l}
              </li>
            ))}
          </ul>
        )}
        {(() => {
          // Two of the six goals have a counterpart in #003. The link hands
          // over the object type only — #002 never learns any dimensions —
          // so the wording promises exactly that and nothing more.
          const fitObject = fitObjectForGoal(goal);
          if (!fitObject) return null;
          return (
            <p className="mt-6 text-sm text-muted">
              <Link
                href={`/experiments/does-it-fit?type=${fitObject}`}
                className="underline hover:text-foreground"
              >
                See whether a {FIT_OBJECT_SPECS[fitObject].label.toLowerCase()}{" "}
                fits there
              </Link>{" "}
              — experiment #003 places one at real size in your room. You enter
              the measurements; nothing is carried over from this scan.
            </p>
          );
        })()}

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
