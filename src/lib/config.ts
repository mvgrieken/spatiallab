/**
 * Server-side configuration. Never import this from client components —
 * it reads secrets from the environment.
 */

/**
 * The Claude model used for vision analysis. Configurable via ANTHROPIC_MODEL
 * so the model is defined in exactly one place.
 */
export const DEFAULT_MODEL = "claude-opus-5";

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORT_LEVELS)[number];

/**
 * Reasoning effort for the vision tasks. Default "medium": measured ~30s for
 * a 6-frame analysis with unchanged quality, where the model default ("high")
 * exceeded the 90–120s timeout chain in real use. Override via
 * ANTHROPIC_EFFORT when a future experiment needs deeper reasoning.
 */
export function getEffort(): Effort {
  const effort = process.env.ANTHROPIC_EFFORT?.trim() as Effort | undefined;
  return effort && EFFORT_LEVELS.includes(effort) ? effort : "medium";
}

export function getApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? key : undefined;
}

/**
 * Optional data-residency hint for the Anthropic API (`inference_geo`),
 * e.g. "eu". Left unset by default; see README → Privacy.
 */
export function getInferenceGeo(): string | undefined {
  const geo = process.env.ANTHROPIC_INFERENCE_GEO?.trim();
  return geo ? geo : undefined;
}

/**
 * Mock mode is only ever active outside production, and only when no API key
 * is configured (or when explicitly forced for local UI work). In production
 * a missing key yields a clear configuration error, never mock data.
 */
export function isMockMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.SPATIALLAB_FORCE_MOCK === "true") return true;
  return !getApiKey();
}
