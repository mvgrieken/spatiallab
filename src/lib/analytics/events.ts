"use client";

import { track as vercelTrack } from "@vercel/analytics";

/**
 * Minimal, privacy-friendly event tracking. Events carry a name only —
 * never question text, images, AI answers or device fingerprints. When
 * analytics is not configured this is a no-op.
 */

export type AnalyticsEvent =
  | "experiment_started"
  | "scan_completed"
  | "analysis_completed"
  | "question_asked"
  | "experiment_completed"
  | "camera_permission_denied";

export function trackEvent(event: AnalyticsEvent): void {
  try {
    vercelTrack(event);
  } catch {
    // Analytics must never break the experiment.
  }
}
