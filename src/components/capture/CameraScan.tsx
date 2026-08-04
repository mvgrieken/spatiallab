"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics/events";
import {
  captureFrameFromVideo,
  fitFramesToBudget,
  pickCaptureTimes,
  SCAN_DURATION_MS,
} from "@/lib/camera/frames";
import type { CapturedFrame } from "@/types/room";

type Props = {
  onFrames: (frames: CapturedFrame[]) => void;
  onCancel: () => void;
  onFallbackToUpload: () => void;
};

type Stage =
  | { name: "explain" }
  | { name: "starting" }
  | { name: "ready" }
  | { name: "scanning" }
  | { name: "denied" }
  | { name: "interrupted" }
  | { name: "failed"; message: string };

function instructionAt(elapsedMs: number): string {
  if (elapsedMs < 3000) return "Move slowly";
  if (elapsedMs < 6000) return "Show the floor and walls";
  if (elapsedMs < 8500) return "Avoid fast turns";
  return "Almost done";
}

/**
 * Guided ~10 second camera sweep. Handles the pre-permission explanation, the
 * native permission prompt, frame capture at spaced intervals, cancellation,
 * tab-hide interruption, and every failure path with a way out (retry or
 * photo upload) — never a dead end.
 */
export function CameraScan({ onFrames, onCancel, onFallbackToUpload }: Props) {
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
    captureTimesRef.current = pickCaptureTimes();
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

      if (now >= SCAN_DURATION_MS) {
        const frames = fitFramesToBudget(framesRef.current);
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
  }, [onFrames, stopStream]);

  const cancel = useCallback(() => {
    stopStream();
    onCancel();
  }, [onCancel, stopStream]);

  const progress = Math.min(1, elapsed / SCAN_DURATION_MS);

  return (
    <div>
      {stage.name === "explain" && (
        <div className="border border-line bg-surface p-5 sm:p-7">
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
            <button
              type="button"
              onClick={startCamera}
              className="min-h-12 bg-accent px-6 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
            >
              Enable camera
            </button>
            <button
              type="button"
              onClick={onFallbackToUpload}
              className="min-h-11 border border-line px-6 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
            >
              Upload photos instead
            </button>
            <button
              type="button"
              onClick={cancel}
              className="min-h-11 text-sm text-faint transition-colors hover:text-foreground"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {(stage.name === "starting" ||
        stage.name === "ready" ||
        stage.name === "scanning") && (
        <div className="border border-line bg-surface">
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
                  {instructionAt(elapsed)}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            {stage.name === "ready" ? (
              <button
                type="button"
                onClick={startScan}
                className="min-h-12 flex-1 bg-accent px-6 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
              >
                Start 10-second sweep
              </button>
            ) : (
              <p className="lab-label">
                {stage.name === "scanning"
                  ? `Scanning ${Math.ceil((SCAN_DURATION_MS - elapsed) / 1000)}s`
                  : "…"}
              </p>
            )}
            <button
              type="button"
              onClick={cancel}
              className="min-h-11 shrink-0 border border-line px-5 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(stage.name === "denied" ||
        stage.name === "interrupted" ||
        stage.name === "failed") && (
        <div className="border border-line bg-surface p-5 sm:p-7">
          <p className="lab-label !text-accent">
            {stage.name === "denied" ? "Camera access declined" : "Scan interrupted"}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            {stage.name === "denied" &&
              "No problem — you can run the experiment with existing photos instead, or allow camera access and try again."}
            {stage.name === "interrupted" &&
              "The scan stopped because the browser was minimized. You can start again."}
            {stage.name === "failed" && stage.message}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onFallbackToUpload}
              className="min-h-12 bg-accent px-6 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
            >
              Upload 3–6 photos instead
            </button>
            <button
              type="button"
              onClick={startCamera}
              className="min-h-11 border border-line px-6 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
            >
              Try the camera again
            </button>
            <button
              type="button"
              onClick={cancel}
              className="min-h-11 text-sm text-faint transition-colors hover:text-foreground"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
