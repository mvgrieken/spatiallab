/**
 * Indicative solar suitability per roof plane — an honest heuristic, not an
 * irradiance model. Anchored to common Dutch rules of thumb (relative annual
 * yield): south @ ~35° ≈ 100%, east/west @ 35° ≈ 85%, flat ≈ 90% (panels get
 * racked at their own angle), north @ 35° ≈ 60%. Everything is labeled as an
 * estimate in the UI; no kWh or financial claims.
 */

import type { RoofPlane } from "@/lib/roof/geometry";

export type SolarRating = "excellent" | "good" | "fair" | "limited";

export type ScoredPlane = RoofPlane & {
  /** 0–100 indicative relative yield. */
  score: number;
  rating: SolarRating;
};

const OPTIMAL_TILT = 35;

/** Indicative relative-yield score (0–100) for one plane. */
export function solarScore(tilt: number, azimuth: number | null): number {
  if (azimuth === null) {
    // Flat roof: panels are mounted at their own optimal angle.
    return 90;
  }
  // South factor: 1 at 180°, ~0.86 at east/west, ~0.55 at north.
  const deltaSouth = Math.abs(((azimuth - 180 + 540) % 360) - 180); // 0..180
  const southFactor = 0.62 + 0.38 * Math.cos((deltaSouth * Math.PI) / 180 / 1.8);
  // Tilt factor: 1 at 35°, gently penalizing steeper/flatter slopes.
  const tiltFactor = 0.85 + 0.15 * Math.cos(((tilt - OPTIMAL_TILT) * Math.PI) / 90);
  return Math.round(100 * Math.min(1, southFactor * tiltFactor));
}

export function ratingFor(score: number): SolarRating {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "fair";
  return "limited";
}

export function scorePlanes(planes: RoofPlane[]): ScoredPlane[] {
  return planes.map((p) => {
    const score = solarScore(p.tilt, p.azimuth);
    return { ...p, score, rating: ratingFor(score) };
  });
}
