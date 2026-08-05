"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { fitFramesToBudget, frameFromImageFile, toDataUrl } from "@/lib/camera/frames";
import type { CapturedFrame } from "@/types/room";

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 6;

type Props = {
  onFrames: (frames: CapturedFrame[]) => void;
  onBack: () => void;
};

/**
 * Fallback path: run the full analysis flow from 3–6 existing photos.
 * Photos are downscaled and re-encoded on-device before anything is sent.
 */
export function PhotoUpload({ onFrames, onBack }: Props) {
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const files = Array.from(list).slice(0, MAX_PHOTOS);
      const converted: CapturedFrame[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        try {
          converted.push(await frameFromImageFile(file));
        } catch {
          // Skip unreadable files; report below if nothing usable remains.
        }
      }
      if (converted.length === 0) {
        setError("None of these files could be read as images.");
      } else {
        setFrames(fitFramesToBudget(converted));
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, []);

  return (
    <Panel>
      <p className="lab-label">Photo upload</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">
        Use {MIN_PHOTOS}–{MAX_PHOTOS} photos of the room
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Pick photos taken from different angles — include the floor and the
        walls. They are downscaled on your device; only the compressed copies
        are sent for analysis. SpatialLab does not store them in its own
        database.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        id="photo-upload-input"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {frames.length > 0 && (
        <ul className="mt-5 grid grid-cols-3 gap-2">
          {frames.map((f, i) => (
            <li key={i} className="relative border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toDataUrl(f)}
                alt={`Selected photo ${i + 1}`}
                className="block aspect-square w-full object-cover"
              />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setFrames((cur) => cur.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center bg-black/60 font-mono text-xs text-white"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-4 text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={busy || frames.length >= MAX_PHOTOS}
        >
          {busy
            ? "Processing photos…"
            : frames.length === 0
              ? "Choose photos"
              : `Add more (${frames.length}/${MAX_PHOTOS})`}
        </Button>
        <Button
          onClick={() => onFrames(frames)}
          disabled={frames.length < MIN_PHOTOS || busy}
        >
          {frames.length < MIN_PHOTOS
            ? `Analyze (need at least ${MIN_PHOTOS} photos)`
            : `Analyze ${frames.length} photos`}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </Panel>
  );
}
