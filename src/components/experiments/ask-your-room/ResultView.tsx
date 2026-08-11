"use client";

import { FormEvent, useState } from "react";

import { AnnotatedFrame, CONFIDENCE_LABELS } from "@/components/shared/AnnotatedFrame";
import { AnswerFeedback } from "@/components/shared/AnswerFeedback";
import { ShareResult } from "@/components/shared/ShareResult";
import { loadImage } from "@/lib/share/card";
import { IndeterminateBar } from "@/components/shared/Progress";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { MAX_QUESTION_LENGTH, MAX_QUESTIONS } from "@/lib/validation/schemas";
import type { RoomAnalysis, RoomAnswer } from "@/types/room";

export type AskedQuestion = {
  question: string;
  answer: RoomAnswer;
};

type Props = {
  analysis: RoomAnalysis;
  frameUrls: string[];
  mock: boolean;
  asked: AskedQuestion[];
  askPending: boolean;
  askError: string | null;
  onAsk: (question: string) => void;
  onRestart: () => void;
};

/**
 * The result screen: short summary, up to three observations anchored to
 * frames, up to three follow-up questions (suggested or free-form), and the
 * answers — each visually tied to the frame that supports it.
 */
export function ResultView({
  analysis,
  frameUrls,
  mock,
  asked,
  askPending,
  askError,
  onAsk,
  onRestart,
}: Props) {
  const [selectedObs, setSelectedObs] = useState(0);
  const [draft, setDraft] = useState("");

  const questionsLeft = MAX_QUESTIONS - asked.length;
  const canAsk = questionsLeft > 0 && !askPending;
  const observation = analysis.observations[selectedObs] ?? analysis.observations[0];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q || !canAsk) return;
    setDraft("");
    onAsk(q);
  };

  return (
    <div className="space-y-10">
      {mock && (
        <p className="border border-accent bg-surface px-4 py-3 font-mono text-xs uppercase tracking-widest text-accent">
          Mock data — no AI was called (development mode)
        </p>
      )}

      {/* Summary */}
      <section>
        <p className="lab-label">First impression</p>
        <p className="mt-2 text-lg leading-snug">{analysis.shortSummary}</p>
      </section>

      {/* Observations */}
      <section>
        <p className="lab-label">Observations</p>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Observations">
          {analysis.observations.map((obs, i) => (
            <button
              key={obs.id}
              type="button"
              role="tab"
              aria-selected={i === selectedObs}
              onClick={() => setSelectedObs(i)}
              className={`min-h-11 border px-4 text-sm transition-colors ${
                i === selectedObs
                  ? "border-line-strong bg-surface font-medium"
                  : "border-line text-muted hover:border-line-strong hover:text-foreground"
              }`}
            >
              {obs.title}
            </button>
          ))}
        </div>
        {observation && (
          <div className="mt-4 space-y-3">
            <AnnotatedFrame
              frameUrls={frameUrls}
              frameIndex={observation.frameIndex}
              marker={observation.marker}
              label={observation.title}
              confidence={observation.confidence}
            />
            <p className="text-[15px] leading-relaxed">{observation.explanation}</p>
            <p className="text-sm text-muted">
              <span className="lab-label mr-2">Evidence</span>
              {observation.visibleEvidence}
            </p>
          </div>
        )}
      </section>

      {/* Questions & answers */}
      <section>
        <div className="flex items-baseline justify-between">
          <p className="lab-label">Ask your room</p>
          <p className="lab-label">
            {asked.length}/{MAX_QUESTIONS} questions
          </p>
        </div>

        {asked.map((qa, i) => (
          <article key={i} className="mt-5 border-t border-line pt-5">
            <p className="text-sm font-medium">
              <span className="font-mono text-xs text-accent">Q{i + 1}</span>{" "}
              {qa.question}
            </p>
            <div className="mt-3 space-y-3">
              <AnnotatedFrame
                frameUrls={frameUrls}
                frameIndex={qa.answer.frameIndex}
                marker={qa.answer.marker}
                label={qa.answer.shortAnswer}
                confidence={qa.answer.confidence}
              />
              <p className="text-[15px] leading-relaxed">{qa.answer.reasoning}</p>
              <p className="text-sm text-muted">
                <span className="lab-label mr-2">Evidence</span>
                {qa.answer.visibleEvidence}
              </p>
              {qa.answer.limitation && (
                <p className="text-sm text-faint">
                  <span className="lab-label mr-2">Caveat</span>
                  {qa.answer.limitation}
                </p>
              )}
            </div>
          </article>
        ))}

        {askPending && (
          <div className="mt-5 border-t border-line pt-5" aria-live="polite">
            <p className="lab-label">Analyzing your question…</p>
            <div className="mt-3">
              <IndeterminateBar />
            </div>
          </div>
        )}

        {askError && (
          <p className="mt-4 text-sm text-accent" role="alert">
            {askError}
          </p>
        )}

        {questionsLeft > 0 ? (
          <div className="mt-6">
            {analysis.suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {analysis.suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={!canAsk}
                    onClick={() => onAsk(q)}
                    className="min-h-11 border border-line px-4 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={submit} className="mt-3 flex gap-2">
              <label htmlFor="room-question" className="sr-only">
                Ask a question about your room
              </label>
              <TextInput
                id="room-question"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MAX_QUESTION_LENGTH}
                placeholder="Or type your own question…"
                disabled={!canAsk}
              />
              <Button
                type="submit"
                disabled={!canAsk || draft.trim().length === 0}
                className="shrink-0 !px-5"
              >
                Ask
              </Button>
            </form>
          </div>
        ) : (
          <p className="mt-6 border border-line bg-surface px-4 py-3 text-sm text-muted">
            That&rsquo;s the three questions for this scan. Scan another room to
            keep exploring.
          </p>
        )}
      </section>

      {/* Confidence legend + restart */}
      <section className="border-t border-line pt-6">
        <AnswerFeedback className="mb-6" />
        <ShareResult
          className="mb-6"
          filename="spatiallab-ask-your-room.png"
          buildSpec={async () => {
            // Share the most recent answer when one exists, otherwise the
            // observation currently on screen — in both cases the thing the
            // visitor is actually looking at.
            const last = asked[asked.length - 1]?.answer;
            const frameIndex = last?.frameIndex ?? observation?.frameIndex ?? 0;
            const marker = last?.marker ?? observation?.marker;
            const hero = await loadImage(
              frameUrls[Math.min(frameIndex, frameUrls.length - 1)] ?? "",
            );
            return {
              experiment: "#001 Ask Your Room",
              headline: last?.shortAnswer ?? observation?.title ?? analysis.shortSummary,
              detail: last
                ? CONFIDENCE_LABELS[last.confidence]
                : observation
                  ? CONFIDENCE_LABELS[observation.confidence]
                  : undefined,
              hero,
              heroSize: hero
                ? { width: hero.naturalWidth, height: hero.naturalHeight }
                : undefined,
              marker,
            };
          }}
        />
        <p className="text-xs text-faint">
          Confidence labels: {CONFIDENCE_LABELS.high} · {CONFIDENCE_LABELS.medium} ·{" "}
          {CONFIDENCE_LABELS.low}. Experimental AI output — estimates are not
          measurements or professional advice.
        </p>
        {analysis.limitations.length > 0 && (
          <ul className="mt-3 space-y-1">
            {analysis.limitations.map((l) => (
              <li key={l} className="text-xs text-faint">
                — {l}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 min-h-12 w-full border border-line-strong px-6 text-sm font-medium transition-colors hover:bg-surface"
        >
          Scan another room
        </button>
      </section>
    </div>
  );
}
