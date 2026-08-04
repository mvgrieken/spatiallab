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
/** Capture more candidates than needed so unusable ones can be dropped. */
export const CANDIDATE_FRAME_COUNT = 9;
/** Frames darker/brighter than these mean-luminance bounds are unusable. */
export const MIN_USABLE_LUMINANCE = 0.05;
export const MAX_USABLE_LUMINANCE = 0.98;
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

/**
 * Reduce captured candidates to at most `target` representative frames:
 * drop near-black and blown-out frames (when luminance is known), then keep
 * an evenly spaced selection so the sweep's viewpoints stay covered. Falls
 * back to the unfiltered set when filtering would leave too little.
 */
export function selectRepresentativeFrames<
  T extends { luminance?: number },
>(frames: T[], target: number = TARGET_FRAME_COUNT): T[] {
  if (frames.length === 0 || target <= 0) return [];
  let usable = frames.filter(
    (f) =>
      f.luminance === undefined ||
      (f.luminance >= MIN_USABLE_LUMINANCE &&
        f.luminance <= MAX_USABLE_LUMINANCE),
  );
  if (usable.length < Math.min(3, frames.length)) usable = frames;
  if (usable.length <= target) return usable;
  const picked: T[] = [];
  const last = usable.length - 1;
  let prev = -1;
  for (let i = 0; i < target; i++) {
    const idx = Math.round((i * last) / (target - 1));
    if (idx !== prev) picked.push(usable[idx]);
    prev = idx;
  }
  return picked;
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

/** Mean luminance (0..1) via a small downsampled copy — cheap per frame. */
function meanLuminance(source: CanvasImageSource, w: number, h: number): number | undefined {
  try {
    const sample = document.createElement("canvas");
    sample.width = 48;
    sample.height = 27;
    const ctx = sample.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(source, 0, 0, w, h, 0, 0, sample.width, sample.height);
    const { data } = ctx.getImageData(0, 0, sample.width, sample.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    return sum / (255 * (data.length / 4));
  } catch {
    return undefined; // luminance is best-effort; never block capture on it
  }
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
  return {
    base64: canvasToJpegBase64(canvas, quality),
    width,
    height,
    luminance: meanLuminance(video, vw, vh),
  };
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
