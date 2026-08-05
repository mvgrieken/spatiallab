import { describe, expect, it } from "vitest";

import {
  describeRoom,
  edcPolyline,
  energyDecayCurve,
  estimateRt60,
  findImpulseOnset,
  qualityFor,
  rmsDb,
} from "./rt60";

const SR = 48_000;

/**
 * Synthesize an impulse response with a known T60: white noise multiplied by
 * an exponential envelope where amplitude drops 60 dB in `t60` seconds.
 * Deterministic RNG so tests never flake.
 */
function synthDecay(
  t60: number,
  seconds = 2,
  { noiseFloor = 0, leadInMs = 50 }: { noiseFloor?: number; leadInMs?: number } = {},
): Float32Array {
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) * 2 - 1;
  };
  const lead = Math.floor((leadInMs / 1000) * SR);
  const n = Math.floor(seconds * SR) + lead;
  const out = new Float32Array(n);
  // -60 dB over t60 seconds → amplitude factor 10^(-3) → tau:
  const decayPerSample = Math.pow(10, -3 / (t60 * SR));
  let amp = 1;
  for (let i = 0; i < n; i++) {
    if (i < lead) {
      out[i] = noiseFloor * rnd();
      continue;
    }
    out[i] = amp * rnd() + noiseFloor * rnd();
    amp *= decayPerSample;
  }
  return out;
}

describe("findImpulseOnset", () => {
  it("finds the clap after a quiet lead-in", () => {
    const sig = synthDecay(0.6, 1, { noiseFloor: 0.001, leadInMs: 100 });
    const onset = findImpulseOnset(sig);
    const expected = 0.1 * SR;
    expect(onset).toBeGreaterThan(expected - 0.02 * SR);
    expect(onset).toBeLessThan(expected + 0.02 * SR);
  });

  it("returns -1 for near-silence", () => {
    const quiet = new Float32Array(SR).map(() => 0.001);
    expect(findImpulseOnset(quiet)).toBe(-1);
  });
});

describe("energyDecayCurve", () => {
  it("starts at 0 dB and decreases monotonically", () => {
    const edc = energyDecayCurve(synthDecay(0.5, 1, { leadInMs: 0 }));
    expect(edc[0]).toBeCloseTo(0, 5);
    for (let i = 1; i < edc.length; i += 500) {
      expect(edc[i]).toBeLessThanOrEqual(edc[i - 1] + 1e-6);
    }
  });
});

describe("estimateRt60 — recovers known T60 values", () => {
  it.each([0.3, 0.6, 1.2])("recovers T60 = %ss within 20%%", (t60) => {
    const sig = synthDecay(t60, Math.max(2, t60 * 2.5), {
      noiseFloor: 0.0005,
      leadInMs: 80,
    });
    const res = estimateRt60(sig, SR);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.estimate.rt60).toBeGreaterThan(t60 * 0.8);
    expect(res.estimate.rt60).toBeLessThan(t60 * 1.2);
    expect(res.estimate.fit).toBeGreaterThan(0.95);
  });

  it("distinguishes a dry room from a reverberant one", () => {
    const dry = estimateRt60(synthDecay(0.25, 2, { noiseFloor: 0.0005 }), SR);
    const wet = estimateRt60(synthDecay(1.5, 4, { noiseFloor: 0.0005 }), SR);
    expect(dry.ok && wet.ok).toBe(true);
    if (dry.ok && wet.ok) {
      expect(wet.estimate.rt60).toBeGreaterThan(dry.estimate.rt60 * 3);
    }
  });
});

describe("estimateRt60 — refuses to invent numbers", () => {
  it("rejects silence", () => {
    const res = estimateRt60(new Float32Array(SR * 2).fill(0.0005), SR);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("no_impulse");
  });

  it("rejects a recording that is too short", () => {
    const res = estimateRt60(synthDecay(0.5, 0.1, { leadInMs: 0 }), SR);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("too_short");
  });

  it("rejects a clap drowned in background noise", () => {
    const res = estimateRt60(synthDecay(0.6, 2, { noiseFloor: 0.6 }), SR);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(["too_noisy", "no_impulse"]).toContain(res.reason);
  });
});

describe("interpretation helpers", () => {
  it("rmsDb behaves sensibly", () => {
    expect(rmsDb(new Float32Array(100).fill(1))).toBeCloseTo(0, 5);
    expect(rmsDb(new Float32Array(100))).toBe(-Infinity);
  });

  it("labels rooms across the range", () => {
    expect(describeRoom(0.2).label).toBe("Dry");
    expect(describeRoom(0.5).label).toBe("Balanced");
    expect(describeRoom(0.75).label).toBe("Live");
    expect(describeRoom(1.2).label).toBe("Reverberant");
    expect(describeRoom(2.5).label).toBe("Very reverberant");
  });

  it("quality reflects fit and dynamic range", () => {
    expect(qualityFor(0.99, 30)).toBe("good");
    expect(qualityFor(0.93, 22)).toBe("fair");
    expect(qualityFor(0.7, 12)).toBe("poor");
  });

  it("edcPolyline returns plottable, clamped points", () => {
    const res = estimateRt60(synthDecay(0.6, 2, { noiseFloor: 0.0005 }), SR);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const pts = edcPolyline(res.edc, SR, 60, 1.5);
    expect(pts).toHaveLength(60);
    expect(pts[0].t).toBe(0);
    for (const p of pts) expect(p.db).toBeGreaterThanOrEqual(-60);
    expect(pts[pts.length - 1].db).toBeLessThan(pts[0].db);
  });
});
