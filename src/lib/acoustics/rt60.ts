/**
 * Experiment #005 — Room Acoustics.
 * Pure reverberation math, unit-tested against synthesized decays with a
 * known T60. Nothing here touches the DOM or Web Audio, so the analysis is
 * verifiable without a device.
 *
 * Method (the standard one, honestly scoped):
 *   1. find the impulse (clap) onset;
 *   2. Schroeder backward integration of the squared signal → energy decay
 *      curve (EDC) in dB;
 *   3. least-squares fit over the -5 → -25 dB span (T20) and extrapolate to
 *      60 dB. T20 is used because a phone recording rarely has 60 dB of
 *      usable dynamic range.
 * This is an indication, never an ISO 3382 measurement.
 */

export type Rt60Quality = "good" | "fair" | "poor";

export type Rt60Estimate = {
  /** Reverberation time in seconds (T20 extrapolated). */
  rt60: number;
  /** Coefficient of determination of the decay fit (0..1). */
  fit: number;
  /** Usable decay range in dB below the peak. */
  usableRangeDb: number;
  quality: Rt60Quality;
};

export type AnalysisFailure =
  | "no_impulse"
  | "too_quiet"
  | "too_noisy"
  | "too_short";

export type Rt60Result =
  | { ok: true; estimate: Rt60Estimate; edc: Float32Array; onset: number }
  | { ok: false; reason: AnalysisFailure };

/** Index of the impulse peak; -1 when the signal has no clear transient. */
export function findImpulseOnset(samples: Float32Array): number {
  let peak = 0;
  let peakIndex = -1;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) {
      peak = v;
      peakIndex = i;
    }
  }
  if (peak < 0.02) return -1; // effectively silence
  // Walk back to where the transient starts (10% of peak).
  const threshold = peak * 0.1;
  let start = peakIndex;
  while (start > 0 && Math.abs(samples[start - 1]) > threshold) start--;
  return start;
}

/** RMS level in dBFS of a slice; -Infinity for digital silence. */
export function rmsDb(samples: Float32Array, from = 0, to = samples.length): number {
  let sum = 0;
  const n = Math.max(0, to - from);
  if (n === 0) return -Infinity;
  for (let i = from; i < to; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / n);
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/**
 * Schroeder backward integration: EDC[i] = 10·log10(∫ᵢ^∞ p²) normalized so
 * that EDC[0] = 0 dB.
 */
export function energyDecayCurve(samples: Float32Array): Float32Array {
  const n = samples.length;
  const edc = new Float32Array(n);
  let running = 0;
  for (let i = n - 1; i >= 0; i--) {
    running += samples[i] * samples[i];
    edc[i] = running;
  }
  const total = edc[0];
  if (total <= 0) return edc.fill(-Infinity);
  for (let i = 0; i < n; i++) {
    edc[i] = 10 * Math.log10(edc[i] / total);
  }
  return edc;
}

/** Least-squares slope (dB per sample) over an index range of the EDC. */
function fitSlope(
  edc: Float32Array,
  from: number,
  to: number,
): { slope: number; r2: number } {
  const n = to - from;
  if (n < 8) return { slope: 0, r2: 0 };
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (let i = from; i < to; i++) {
    const x = i - from;
    const y = edc[i];
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { slope: 0, r2: 0 };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  let ssRes = 0;
  const mean = sy / n;
  let ssTot = 0;
  for (let i = from; i < to; i++) {
    const x = i - from;
    const pred = slope * x + intercept;
    ssRes += (edc[i] - pred) ** 2;
    ssTot += (edc[i] - mean) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope, r2 };
}

/** First index where the EDC drops below `db`; -1 if it never does. */
function indexAtDb(edc: Float32Array, db: number, from = 0): number {
  for (let i = from; i < edc.length; i++) {
    if (edc[i] <= db) return i;
  }
  return -1;
}

export function qualityFor(fit: number, usableRangeDb: number): Rt60Quality {
  if (fit >= 0.98 && usableRangeDb >= 25) return "good";
  if (fit >= 0.9 && usableRangeDb >= 20) return "fair";
  return "poor";
}

/**
 * Estimate RT60 from a recorded impulse response.
 * `samples` should start at (or just before) the clap.
 */
export function estimateRt60(
  samples: Float32Array,
  sampleRate: number,
): Rt60Result {
  if (samples.length < sampleRate * 0.3) return { ok: false, reason: "too_short" };

  const onset = findImpulseOnset(samples);
  if (onset < 0) return { ok: false, reason: "no_impulse" };

  const decay = samples.subarray(onset);
  if (decay.length < sampleRate * 0.25) return { ok: false, reason: "too_short" };

  const peakDb = rmsDb(decay, 0, Math.floor(sampleRate * 0.01));
  const tailStart = Math.max(0, decay.length - Math.floor(sampleRate * 0.1));
  const noiseDb = rmsDb(decay, tailStart, decay.length);
  if (peakDb < -45) return { ok: false, reason: "too_quiet" };
  // Need meaningful headroom between the clap and the room's noise floor.
  if (peakDb - noiseDb < 20) return { ok: false, reason: "too_noisy" };

  const edc = energyDecayCurve(decay);
  const i5 = indexAtDb(edc, -5);
  const i25 = indexAtDb(edc, -25, Math.max(0, i5));
  if (i5 < 0 || i25 < 0 || i25 <= i5) return { ok: false, reason: "too_noisy" };

  const { slope, r2 } = fitSlope(edc, i5, i25);
  if (slope >= 0) return { ok: false, reason: "too_noisy" };

  // slope is dB per sample; time for 60 dB of decay:
  const rt60 = -60 / slope / sampleRate;
  const floorIndex = indexAtDb(edc, -60);
  const usableRangeDb = floorIndex >= 0 ? 60 : Math.abs(edc[edc.length - 1]);

  if (!Number.isFinite(rt60) || rt60 <= 0.02 || rt60 > 12) {
    return { ok: false, reason: "too_noisy" };
  }

  return {
    ok: true,
    estimate: {
      rt60,
      fit: r2,
      usableRangeDb,
      quality: qualityFor(r2, usableRangeDb),
    },
    edc,
    onset,
  };
}

export type RoomCharacter = {
  label: string;
  /** One honest sentence about what this means in practice. */
  meaning: string;
};

/** Plain-language interpretation. Thresholds follow common practice for
 *  small rooms (speech intelligibility), not a standard. */
export function describeRoom(rt60: number): RoomCharacter {
  if (rt60 < 0.35) {
    return {
      label: "Dry",
      meaning:
        "Sound dies quickly. Good for calls and recording; large rooms this dry can feel muffled.",
    };
  }
  if (rt60 < 0.6) {
    return {
      label: "Balanced",
      meaning:
        "A comfortable middle ground — speech stays clear without sounding dead.",
    };
  }
  if (rt60 < 0.9) {
    return {
      label: "Live",
      meaning:
        "Noticeable reverb. Music can sound fuller, but calls may get echoey.",
    };
  }
  if (rt60 < 1.5) {
    return {
      label: "Reverberant",
      meaning:
        "Speech starts to smear. Soft furnishings, curtains or a rug would calm it down.",
    };
  }
  return {
    label: "Very reverberant",
    meaning:
      "Long tail, like a hall or empty room. Conversations become hard to follow.",
  };
}

/** Downsample the EDC to a fixed number of points for plotting. */
export function edcPolyline(
  edc: Float32Array,
  sampleRate: number,
  points = 120,
  maxSeconds = 2,
): Array<{ t: number; db: number }> {
  const limit = Math.min(edc.length, Math.floor(sampleRate * maxSeconds));
  const out: Array<{ t: number; db: number }> = [];
  for (let p = 0; p < points; p++) {
    const i = Math.floor((p / (points - 1)) * (limit - 1));
    const db = Math.max(-60, edc[i]);
    out.push({ t: i / sampleRate, db });
  }
  return out;
}
