import type { CapturedFrame } from "@/types/room";

/**
 * Client-side frame extraction and compression. Only the selected, downscaled
 * JPEG frames ever leave the device — the live video stream is never recorded,
 * stored or uploaded.
 *
 * The pure helpers at the top are unit-tested; the DOM-dependent capture
 * functions below are exercised manually (see docs/iphone-testing.md).
 */

export const SCAN_DURATION_MS = 10_000;
export const TARGET_FRAME_COUNT = 6;
export const MAX_LONG_EDGE = 1280;
export const JPEG_QUALITY = 0.72;
/** Client-side budget for the JSON payload; server rejects above ~4.2 MB. */
export const CLIENT_REQUEST_BUDGET_BYTES = 3_800_000;

/** Scale (w, h) so the longest edge is at most `maxLongEdge`, never upscaling. */
export function computeScaledSize(
  width: number,
  height: number,
  maxLongEdge: number = MAX_LONG_EDGE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Evenly spaced capture moments across the sweep, skipping the very start
 * (users are still raising the phone) and ending just before the sweep ends.
 */
export function pickCaptureTimes(
  durationMs: number = SCAN_DURATION_MS,
  count: number = TARGET_FRAME_COUNT,
): number[] {
  if (count <= 0 || durationMs <= 0) return [];
  const start = Math.min(1000, durationMs * 0.1);
  const end = durationMs * 0.95;
  if (count === 1) return [Math.round((start + end) / 2)];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(start + i * step));
}

/** Approximate JSON body size in bytes for a set of base64 frames. */
export function estimateRequestBytes(base64Frames: string[]): number {
  const overheadPerFrame = 16;
  return base64Frames.reduce(
    (sum, f) => sum + f.length + overheadPerFrame,
    512,
  );
}

/** Strip a `data:image/...;base64,` prefix if present. */
export function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(",");
  return value.startsWith("data:") && comma !== -1
    ? value.slice(comma + 1)
    : value;
}

export function toDataUrl(frame: CapturedFrame): string {
  return `data:image/jpeg;base64,${frame.base64}`;
}

// ---------------------------------------------------------------------------
// DOM-dependent capture pipeline (browser only)
// ---------------------------------------------------------------------------

function canvasToJpegBase64(canvas: HTMLCanvasElement, quality: number): string {
  return stripDataUrlPrefix(canvas.toDataURL("image/jpeg", quality));
}

/** Capture the current video frame, downscaled and JPEG-compressed. */
export function captureFrameFromVideo(
  video: HTMLVideoElement,
  quality: number = JPEG_QUALITY,
): CapturedFrame | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const { width, height } = computeScaledSize(vw, vh);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return { base64: canvasToJpegBase64(canvas, quality), width, height };
}

/** Downscale + re-encode an uploaded image file to a JPEG frame. */
export async function frameFromImageFile(
  file: File,
  quality: number = JPEG_QUALITY,
): Promise<CapturedFrame> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = computeScaledSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return { base64: canvasToJpegBase64(canvas, quality), width, height };
  } finally {
    bitmap.close();
  }
}

/**
 * If the combined payload exceeds the client budget, re-encode at a lower
 * quality is not possible from base64 alone — instead drop frames evenly
 * until the estimate fits. Returns a (possibly shorter) list.
 */
export function fitFramesToBudget(
  frames: CapturedFrame[],
  budgetBytes: number = CLIENT_REQUEST_BUDGET_BYTES,
): CapturedFrame[] {
  const current = [...frames];
  while (
    current.length > 1 &&
    estimateRequestBytes(current.map((f) => f.base64)) > budgetBytes
  ) {
    // Drop from the middle to keep the first and last viewpoints.
    current.splice(Math.floor(current.length / 2), 1);
  }
  return current;
}
