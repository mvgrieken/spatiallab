import { describe, expect, it } from "vitest";

import {
  CLIENT_REQUEST_BUDGET_BYTES,
  computeScaledSize,
  estimateRequestBytes,
  fitFramesToBudget,
  pickCaptureTimes,
  SCAN_DURATION_MS,
  stripDataUrlPrefix,
  TARGET_FRAME_COUNT,
} from "./frames";
import type { CapturedFrame } from "@/types/room";

describe("computeScaledSize", () => {
  it("downscales the long edge to the maximum", () => {
    expect(computeScaledSize(1920, 1080, 1280)).toEqual({
      width: 1280,
      height: 720,
    });
    expect(computeScaledSize(1080, 1920, 1280)).toEqual({
      width: 720,
      height: 1280,
    });
  });

  it("never upscales", () => {
    expect(computeScaledSize(640, 480, 1280)).toEqual({ width: 640, height: 480 });
  });

  it("handles degenerate input", () => {
    expect(computeScaledSize(0, 100, 1280)).toEqual({ width: 0, height: 0 });
  });
});

describe("pickCaptureTimes", () => {
  it("produces the target number of increasing times within the sweep", () => {
    const times = pickCaptureTimes();
    expect(times).toHaveLength(TARGET_FRAME_COUNT);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
    expect(times[0]).toBeGreaterThan(0);
    expect(times[times.length - 1]).toBeLessThanOrEqual(SCAN_DURATION_MS);
  });

  it("handles edge cases", () => {
    expect(pickCaptureTimes(10_000, 0)).toEqual([]);
    expect(pickCaptureTimes(0, 6)).toEqual([]);
    expect(pickCaptureTimes(10_000, 1)).toHaveLength(1);
  });
});

describe("stripDataUrlPrefix", () => {
  it("strips a data URL prefix", () => {
    expect(stripDataUrlPrefix("data:image/jpeg;base64,abc123")).toBe("abc123");
  });
  it("leaves raw base64 untouched", () => {
    expect(stripDataUrlPrefix("abc123")).toBe("abc123");
  });
});

describe("request budget", () => {
  const frame = (size: number): CapturedFrame => ({
    base64: "A".repeat(size),
    width: 1280,
    height: 720,
  });

  it("estimates roughly the sum of frame sizes", () => {
    const estimate = estimateRequestBytes(["A".repeat(1000), "A".repeat(2000)]);
    expect(estimate).toBeGreaterThan(3000);
    expect(estimate).toBeLessThan(4000);
  });

  it("keeps frames under budget untouched", () => {
    const frames = Array.from({ length: 6 }, () => frame(100_000));
    expect(fitFramesToBudget(frames)).toHaveLength(6);
  });

  it("drops middle frames until the payload fits", () => {
    const frames = Array.from({ length: 8 }, () => frame(900_000));
    const fitted = fitFramesToBudget(frames);
    expect(fitted.length).toBeLessThan(8);
    expect(
      estimateRequestBytes(fitted.map((f) => f.base64)),
    ).toBeLessThanOrEqual(CLIENT_REQUEST_BUDGET_BYTES);
    // First and last viewpoints are preserved.
    expect(fitted[0]).toBe(frames[0]);
    expect(fitted[fitted.length - 1]).toBe(frames[7]);
  });

  it("never drops the final remaining frame", () => {
    const huge = [frame(5_000_000)];
    expect(fitFramesToBudget(huge)).toHaveLength(1);
  });
});
