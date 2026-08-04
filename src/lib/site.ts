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
