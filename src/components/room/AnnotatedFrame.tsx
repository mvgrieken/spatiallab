"use client";

import { useState } from "react";

import type { Confidence, Marker } from "@/types/room";

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Likely",
  low: "Uncertain",
};

type Props = {
  /** Data URLs of all frames, in capture order. */
  frameUrls: string[];
  /** Frame the annotation belongs to. */
  frameIndex: number;
  marker?: Marker;
  /** Short text shown with the annotation. */
  label: string;
  confidence: Confidence;
  /** Allow browsing all frames (marker only shows on its own frame). */
  browsable?: boolean;
};

/**
 * The core artifact of the experiment: a captured frame with the AI's
 * annotation visually anchored to it. The marker is decorative — the same
 * information is always present as text, so screen readers lose nothing.
 */
export function AnnotatedFrame({
  frameUrls,
  frameIndex,
  marker,
  label,
  confidence,
  browsable = true,
}: Props) {
  const [current, setCurrent] = useState(frameIndex);
  // Reset the browsed frame when the annotation's frame changes
  // (React's "adjust state during render" pattern).
  const [prevFrameIndex, setPrevFrameIndex] = useState(frameIndex);
  if (prevFrameIndex !== frameIndex) {
    setPrevFrameIndex(frameIndex);
    setCurrent(frameIndex);
  }

  const showMarker = marker && current === frameIndex;
  const url = frameUrls[Math.min(current, frameUrls.length - 1)];

  return (
    <figure className="border border-line bg-surface">
      <div className="relative overflow-hidden">
        {/* Data-URL frames can't go through next/image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`Room frame ${current + 1} of ${frameUrls.length}`}
          className="block w-full"
        />
        {showMarker && (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `${marker.x * 100}%`,
              top: `${marker.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="marker-ring absolute inset-0 block h-4 w-4 rounded-full border-2 border-marker" />
            <span className="block h-4 w-4 rounded-full border-2 border-white bg-marker shadow-md" />
          </span>
        )}
        <span className="lab-label absolute left-2 top-2 bg-background/85 px-2 py-1 !text-foreground backdrop-blur-sm">
          Frame {current + 1}/{frameUrls.length}
          {showMarker ? " · marked" : ""}
        </span>
      </div>
      <figcaption className="flex items-start justify-between gap-3 border-t border-line px-4 py-3">
        <p className="text-sm font-medium leading-snug">{label}</p>
        <span className="lab-label mt-0.5 shrink-0 !text-accent">
          {CONFIDENCE_LABELS[confidence]}
        </span>
      </figcaption>
      {browsable && frameUrls.length > 1 && (
        <div className="flex items-center justify-between border-t border-line px-2 py-1.5">
          <button
            type="button"
            onClick={() =>
              setCurrent((c) => (c - 1 + frameUrls.length) % frameUrls.length)
            }
            className="min-h-11 min-w-11 px-3 font-mono text-sm text-muted transition-colors hover:text-foreground"
            aria-label="Previous frame"
          >
            ←
          </button>
          {marker && current !== frameIndex && (
            <button
              type="button"
              onClick={() => setCurrent(frameIndex)}
              className="lab-label min-h-11 px-2 transition-colors hover:text-foreground"
            >
              Back to marked frame
            </button>
          )}
          <button
            type="button"
            onClick={() => setCurrent((c) => (c + 1) % frameUrls.length)}
            className="min-h-11 min-w-11 px-3 font-mono text-sm text-muted transition-colors hover:text-foreground"
            aria-label="Next frame"
          >
            →
          </button>
        </div>
      )}
    </figure>
  );
}
