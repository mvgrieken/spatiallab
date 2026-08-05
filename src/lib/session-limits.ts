"use client";

/**
 * Session-scoped usage counters (sessionStorage-backed, refresh-proof).
 * Cost guard shared by experiments; storage failures (private mode) degrade
 * to the per-scan limits that every experiment also enforces.
 */

export function readSessionCount(key: string): number {
  try {
    return Number(sessionStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

export function bumpSessionCount(key: string): void {
  try {
    sessionStorage.setItem(key, String(readSessionCount(key) + 1));
  } catch {
    // Storage unavailable — per-scan limits still apply.
  }
}
