/**
 * Fleet killswitch — copied from the shared atthis template
 * (~/dev/killswitch/middleware/killswitch.ts). Checked first in the proxy,
 * before auth. Flags live in Vercel Edge Config; reads fail OPEN.
 */

export type FlagBag = Record<string, unknown> | null;

/** Per-app flag key. Underscore, NOT a colon: Vercel Edge Config rejects any
 *  key outside [A-Za-z0-9_-]. */
export function appFlagKey(appSlug: string): string {
  return `killswitch_${appSlug}`;
}

/** Pure decision: is this app killed? Fails open (null → false). */
export function shouldKill(flags: FlagBag, appSlug: string): boolean {
  if (!flags) return false;
  return flags["killswitch"] === true || flags[appFlagKey(appSlug)] === true;
}

/** Path prefixes that must never 503 (cron, webhooks, health). */
export function isBypassed(pathname: string, bypass: string[]): boolean {
  return bypass.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const MAINTENANCE_HTML = `<!doctype html><meta charset=utf-8><title>Tijdelijk offline</title>
<div style="font:16px system-ui;max-width:32rem;margin:20vh auto;text-align:center">
<h1>Tijdelijk offline</h1><p>Deze dienst is even niet beschikbaar. Probeer het straks opnieuw.</p>
<p style="color:#888">This service is temporarily offline. Please try again shortly.</p></div>`;

export function maintenanceResponse(): Response {
  return new Response(MAINTENANCE_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": "3600",
      "cache-control": "no-store",
    },
  });
}
