"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { trackEvent } from "@/lib/analytics/events";
import {
  CANDIDATE_FRAME_COUNT,
  captureFrameFromVideo,
  fitFramesToBudget,
  pickCaptureTimes,
  SCAN_DURATION_MS,
  selectRepresentativeFrames,
} from "@/lib/camera/frames";
import type { CapturedFrame } from "@/types/room";

/** Timed on-screen hint: shown until `untilMs` into the sweep. */
export type ScanInstruction = { untilMs: number; text: string };

const DEFAULT_INSTRUCTIONS: ScanInstruction[] = [
  { untilMs: 3000, text: "Move slowly" },
  { untilMs: 6000, text: "Show the floor and walls" },
  { untilMs: 8500, text: "Avoid fast turns" },
  { untilMs: Infinity, text: "Almost done" },
];

type Props = {
  onFrames: (frames: CapturedFrame[]) => void;
  onCancel: () => void;
  onFallbackToUpload: () => void;
  /** Sweep length; defaults to the standard 10 s. */
  durationMs?: number;
  /** On-screen hints during the sweep. */
  instructions?: ScanInstruction[];
};

type Stage =
  | { name: "explain" }
  | { name: "starting" }
  | { name: "ready" }
  | { name: "scanning" }
  | { name: "denied" }
  | { name: "interrupted" }
  | { name: "failed"; message: string };

/**
 * Guided camera sweep, reusable by any experiment that needs frames from a
 * live camera. Handles the pre-permission explanation, the native permission
 * prompt, spaced frame capture, cancellation, tab-hide interruption, and
 * every failure path with a way out (retry or photo upload) — never a dead
 * end.
 */
export function CameraScan({
  onFrames,
  onCancel,
  onFallbackToUpload,
  durationMs = SCAN_DURATION_MS,
  instructions = DEFAULT_INSTRUCTIONS,
}: Props) {
  const [stage, setStage] = useState<Stage>({ name: "explain" });
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const framesRef = useRef<CapturedFrame[]>([]);
  const captureTimesRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);

  const stopStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  // Abort a running scan when Safari is minimized / tab hidden.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && timerRef.current) {
        stopStream();
        setStage({ name: "interrupted" });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [stopStream]);

  const startCamera = useCallback(async () => {
    setStage({ name: "starting" });
    if (!navigator.mediaDevices?.getUserMedia) {
      setStage({
        name: "failed",
        message: "Camera capture is not available in this browser.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopStream();
        return;
      }
      video.srcObject = stream;
      await video.play();
      setStage({ name: "ready" });
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError");
      if (denied) {
        trackEvent("camera_permission_denied");
        setStage({ name: "denied" });
      } else {
        setStage({
          name: "failed",
          message: "The camera could not be started on this device.",
        });
      }
    }
  }, [stopStream]);

  const startScan = useCallback(() => {
    framesRef.current = [];
    captureTimesRef.current = pickCaptureTimes(durationMs, CANDIDATE_FRAME_COUNT);
    startedAtRef.current = Date.now();
    setElapsed(0);
    setStage({ name: "scanning" });

    timerRef.current = setInterval(() => {
      const video = videoRef.current;
      const now = Date.now() - startedAtRef.current;
      setElapsed(now);

      while (
        captureTimesRef.current.length > 0 &&
        now >= captureTimesRef.current[0]
      ) {
        captureTimesRef.current.shift();
        if (video) {
          const frame = captureFrameFromVideo(video);
          if (frame) framesRef.current.push(frame);
        }
      }

      if (now >= durationMs) {
        const frames = fitFramesToBudget(
          selectRepresentativeFrames(framesRef.current),
        );
        stopStream();
        if (frames.length === 0) {
          setStage({
            name: "failed",
            message: "No usable frames were captured. Try again with more light.",
          });
          return;
        }
        trackEvent("scan_completed");
        onFrames(frames);
      }
    }, 100);
  }, [durationMs, onFrames, stopStream]);

  const cancel = useCallback(() => {
    stopStream();
    onCancel();
  }, [onCancel, stopStream]);

  const progress = Math.min(1, elapsed / durationMs);
  const instruction =
    instructions.find((i) => elapsed < i.untilMs)?.text ??
    instructions[instructions.length - 1]?.text ??
    "";

  return (
    <div>
      {stage.name === "explain" && (
        <Panel>
          <p className="lab-label">Before we start</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Temporary camera access
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            SpatialLab needs temporary camera access to understand your room.
            Selected frames are sent securely to the AI provider for analysis.
            SpatialLab does not store them in its own database.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={startCamera}>Enable camera</Button>
            <Button variant="secondary" onClick={onFallbackToUpload}>
              Upload photos instead
            </Button>
            <Button variant="ghost" onClick={cancel}>
              Back
            </Button>
          </div>
        </Panel>
      )}

      {(stage.name === "starting" ||
        stage.name === "ready" ||
        stage.name === "scanning") && (
        <Panel padded={false}>
          <div className="relative aspect-[3/4] overflow-hidden bg-black sm:aspect-video">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />
            {stage.name === "starting" && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                Starting camera…
              </p>
            )}
            {stage.name === "scanning" && (
              <>
                <div
                  className="absolute left-0 top-0 h-1 bg-marker transition-[width] duration-100 ease-linear motion-reduce:transition-none"
                  style={{ width: `${progress * 100}%` }}
                />
                <p
                  aria-live="polite"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/60 px-4 py-2 font-mono text-xs uppercase tracking-widest text-white backdrop-blur-sm"
                >
                  {instruction}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            {stage.name === "ready" ? (
              <Button className="flex-1" onClick={startScan}>
                Start {Math.round(durationMs / 1000)}-second sweep
              </Button>
            ) : (
              <p className="lab-label">
                {stage.name === "scanning"
                  ? `Scanning ${Math.ceil((durationMs - elapsed) / 1000)}s`
                  : "…"}
              </p>
            )}
            <Button variant="secondary" className="shrink-0 !px-5" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </Panel>
      )}

      {(stage.name === "denied" ||
        stage.name === "interrupted" ||
        stage.name === "failed") && (
        <ErrorPanel
          title={
            stage.name === "denied" ? "Camera access declined" : "Scan interrupted"
          }
          message={
            stage.name === "denied"
              ? "No problem — you can run the experiment with existing photos instead, or allow camera access and try again."
              : stage.name === "interrupted"
                ? "The scan stopped because the browser was minimized. You can start again."
                : stage.message
          }
          actions={[
            { label: "Upload 3–6 photos instead", onClick: onFallbackToUpload },
            {
              label: "Try the camera again",
              onClick: startCamera,
              variant: "secondary",
            },
            { label: "Back", onClick: cancel, variant: "ghost" },
          ]}
        />
      )}
    </div>
  );
}
