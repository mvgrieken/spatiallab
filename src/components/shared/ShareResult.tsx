"use client";

import { useState } from "react";

import { composeShareCard, shareCard, type CardSpec } from "@/lib/share/card";

type Props = {
  /** Built lazily, on tap: the hero may be a canvas that must be read at the
   *  moment of sharing rather than at render time. */
  buildSpec: () => Promise<CardSpec | null>;
  filename: string;
  className?: string;
};

/**
 * "Share this result" — composes a card from the visitor's own result on their
 * own device and hands it to the native share sheet, or downloads it.
 *
 * Unlike the feedback tap, this is user-initiated, so a failure is reported
 * instead of swallowed: someone who taps a button deserves to know it did not
 * work.
 */
export function ShareResult({ buildSpec, filename, className }: Props) {
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");

  async function run() {
    if (state === "working") return;
    setState("working");
    try {
      const spec = await buildSpec();
      const blob = spec ? await composeShareCard(spec) : null;
      const ok = blob ? await shareCard(blob, filename) : false;
      setState(ok ? "idle" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={run}
        disabled={state === "working"}
        className="min-h-11 border border-line px-4 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground disabled:opacity-50"
      >
        {state === "working" ? "Preparing image…" : "Share this result"}
      </button>
      {state === "failed" && (
        <p className="mt-2 text-sm text-faint" role="alert">
          The image could not be created on this device. The result is still on
          screen — a screenshot works too.
        </p>
      )}
    </div>
  );
}
