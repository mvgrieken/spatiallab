"use client";

import { useState } from "react";

/**
 * The one-tap honesty question under every result.
 *
 * Deliberately tiny: two words, no form, no thank-you modal. The tap is
 * fire-and-forget — the network call is never awaited for the UI, so a slow or
 * broken store cannot make the result screen feel broken.
 */
export function AnswerFeedback({ className }: { className?: string }) {
  const [voted, setVoted] = useState<"correct" | "incorrect" | null>(null);

  function vote(choice: "correct" | "incorrect") {
    if (voted) return;
    setVoted(choice);
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote: choice }),
      keepalive: true, // survives the visitor navigating away immediately
    }).catch(() => {
      // A failed vote is never surfaced: it is our data problem, not theirs.
    });
  }

  if (voted) {
    return (
      <p className={`text-sm text-faint${className ? ` ${className}` : ""}`}>
        Thanks — that helps.{" "}
        <a href="/stats" className="underline hover:text-foreground">
          See what people report
        </a>
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3${className ? ` ${className}` : ""}`}>
      <span className="text-sm text-faint">Was this answer right?</span>
      <button
        type="button"
        onClick={() => vote("correct")}
        className="min-h-11 border border-line px-4 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => vote("incorrect")}
        className="min-h-11 border border-line px-4 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
      >
        No
      </button>
    </div>
  );
}
