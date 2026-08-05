"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DecayChart } from "@/components/experiments/room-acoustics/DecayChart";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { trackEvent } from "@/lib/analytics/events";
import {
  MicError,
  openMicrophone,
  recordSamples,
  stopStream,
} from "@/lib/acoustics/record";
import {
  describeRoom,
  edcPolyline,
  estimateRt60,
  type AnalysisFailure,
  type Rt60Estimate,
} from "@/lib/acoustics/rt60";

const RECORD_SECONDS = 3;

type Result = {
  estimate: Rt60Estimate;
  points: Array<{ t: number; db: number }>;
};

type Phase =
  | { name: "intro" }
  | { name: "ready" }
  | { name: "recording" }
  | { name: "result"; result: Result }
  | { name: "error"; title: string; message: string; canRetry: boolean };

const FAILURE_COPY: Record<AnalysisFailure, { title: string; message: string }> = {
  no_impulse: {
    title: "No clap detected",
    message:
      "The recording had no clear transient. Hold the phone at arm's length and give one sharp clap right after tapping.",
  },
  too_quiet: {
    title: "Clap too quiet",
    message:
      "The clap barely registered. Try again with a sharper clap, and keep the microphone unobstructed.",
  },
  too_noisy: {
    title: "Too much background noise",
    message:
      "The room's noise floor swallowed the decay, so any number would be made up. Try again when it's quieter.",
  },
  too_short: {
    title: "Recording too short",
    message: "The recording was cut off. Please try again.",
  },
};

const QUALITY_NOTE: Record<Rt60Estimate["quality"], string> = {
  good: "Clean decay — this estimate is as good as a phone mic gets.",
  fair: "Usable decay, but the room noise limits precision. Treat it as a ballpark.",
  poor: "Noisy decay — the number is a rough hint only. Clap again in a quieter moment.",
};

/**
 * Experiment #005 — Room Acoustics: one clap, an on-device reverberation
 * estimate. No upload, no AI: the audio stays in memory and is analysed in
 * the browser, then discarded.
 */
export function RoomAcoustics() {
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [level, setLevel] = useState(0);
  /** Mirrors the ref so render can branch on it (refs aren't render state). */
  const [micOpen, setMicOpen] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => stopStream(streamRef.current), []);

  const enableMic = useCallback(async () => {
    trackEvent("experiment_started");
    try {
      streamRef.current = await openMicrophone();
      setMicOpen(true);
      setPhase({ name: "ready" });
    } catch (err) {
      const mic = err instanceof MicError ? err : null;
      if (mic?.kind === "denied") trackEvent("camera_permission_denied");
      setPhase({
        name: "error",
        title: mic?.kind === "denied" ? "Microphone access declined" : "Microphone unavailable",
        message:
          mic?.kind === "denied"
            ? "This experiment needs the microphone to hear your room's reverb. Nothing is recorded to a server — the audio never leaves your device."
            : (mic?.message ?? "The microphone could not be started."),
        canRetry: true,
      });
    }
  }, []);

  const clap = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) {
      setPhase({ name: "intro" });
      return;
    }
    setLevel(0);
    setPhase({ name: "recording" });
    try {
      const { samples, sampleRate } = await recordSamples(
        stream,
        RECORD_SECONDS,
        setLevel,
      );
      const analysis = estimateRt60(samples, sampleRate);
      if (!analysis.ok) {
        const copy = FAILURE_COPY[analysis.reason];
        setPhase({ ...copy, name: "error", canRetry: true });
        return;
      }
      trackEvent("analysis_completed");
      trackEvent("experiment_completed");
      setPhase({
        name: "result",
        result: {
          estimate: analysis.estimate,
          points: edcPolyline(
            analysis.edc,
            sampleRate,
            120,
            Math.min(2.5, Math.max(1, analysis.estimate.rt60 * 1.6)),
          ),
        },
      });
    } catch {
      setPhase({
        name: "error",
        title: "Recording failed",
        message: "The microphone stopped unexpectedly. Please try again.",
        canRetry: true,
      });
    }
  }, []);

  const restart = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setMicOpen(false);
    setPhase({ name: "intro" });
  }, []);

  return (
    <div>
      {phase.name === "intro" && (
        <div>
          <Panel>
            <p className="lab-label">Before we start</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Temporary microphone access
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              SpatialLab listens to a single clap to measure how long sound
              lingers in your room. The audio is analysed on your device and
              never uploaded, stored or played back — no AI provider is
              involved in this experiment.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button className="min-h-13 py-3.5 text-base" onClick={enableMic}>
                Enable microphone
              </Button>
            </div>
          </Panel>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            An indication of reverberation time, not an acoustic measurement.
          </p>
        </div>
      )}

      {(phase.name === "ready" || phase.name === "recording") && (
        <Panel>
          <p className="lab-label">
            {phase.name === "ready" ? "Ready" : "Listening"}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            {phase.name === "ready"
              ? "Clap once, right after you tap"
              : "Clap now"}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Hold the phone at arm&rsquo;s length, away from walls, and give one
            sharp clap. Recording lasts {RECORD_SECONDS} seconds.
          </p>

          <div className="mt-5 h-2 w-full overflow-hidden bg-line" aria-hidden>
            <div
              className="h-full bg-marker transition-[width] duration-75 motion-reduce:transition-none"
              style={{ width: `${Math.min(100, Math.round(level * 140))}%` }}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="min-h-13 py-3.5 text-base"
              onClick={clap}
              disabled={phase.name === "recording"}
            >
              {phase.name === "recording" ? "Listening…" : "Record my clap"}
            </Button>
            <Button variant="ghost" onClick={restart}>
              Back
            </Button>
          </div>
        </Panel>
      )}

      {phase.name === "result" && (
        <div className="space-y-8">
          <section>
            <p className="lab-label">Your room</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight">
              {phase.result.estimate.rt60.toFixed(2)}
              <span className="ml-1 text-2xl text-muted">s</span>
            </p>
            <p className="mt-1 text-lg">
              {describeRoom(phase.result.estimate.rt60).label}
              <span className="lab-label ml-3">
                RT60 · {phase.result.estimate.quality}
              </span>
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              {describeRoom(phase.result.estimate.rt60).meaning}
            </p>
          </section>

          <DecayChart
            points={phase.result.points}
            rt60={phase.result.estimate.rt60}
          />

          <section>
            <p className="text-sm text-muted">
              <span className="lab-label mr-2">Confidence</span>
              {QUALITY_NOTE[phase.result.estimate.quality]}
            </p>
          </section>

          <section className="border-t border-line pt-5">
            <ul className="space-y-1">
              <li className="text-xs text-faint">
                — Estimated from a single clap with a phone microphone, using
                the decay between −5 and −25 dB. Not an ISO 3382 measurement.
              </li>
              <li className="text-xs text-faint">
                — Where you stand, how you clap and where the phone points all
                shift the result. Clap a few times to see the spread.
              </li>
              <li className="text-xs text-faint">
                — No advice about materials, treatment or building work.
              </li>
            </ul>
            <div className="mt-5 flex flex-col gap-3">
              <Button onClick={() => setPhase({ name: "ready" })}>
                Clap again
              </Button>
              <Button variant="secondary" onClick={restart}>
                Done
              </Button>
            </div>
          </section>
        </div>
      )}

      {phase.name === "error" && (
        <ErrorPanel
          title={phase.title}
          message={phase.message}
          actions={[
            ...(micOpen
              ? [{ label: "Try again", onClick: () => setPhase({ name: "ready" }) }]
              : [{ label: "Enable microphone", onClick: enableMic }]),
            { label: "Start over", onClick: restart, variant: "secondary" as const },
          ]}
        />
      )}
    </div>
  );
}
