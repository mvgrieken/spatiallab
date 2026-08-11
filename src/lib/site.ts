export const REPO_URL = "https://github.com/mvgrieken/spatiallab";

/**
 * Git ref that "how it works" code links point at.
 *
 * `main` moves, so a link published today can describe code that no longer
 * exists. Pin this to a tag or commit at launch (it is a one-line change, and
 * it is on the launch checklist) so the explanations and the code a reader
 * lands on stay in step.
 */
export const CODE_REF = "main";

export function codeLink(path: string): string {
  return `${REPO_URL}/blob/${CODE_REF}/${path}`;
}

/**
 * Resolve the canonical site URL. Explicit NEXT_PUBLIC_SITE_URL wins;
 * on Vercel preview deployments we fall back to the deployment URL so
 * metadata, sitemap and OG cards are correct without per-preview config.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
