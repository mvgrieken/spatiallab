/**
 * Key names and budget arithmetic for the counter store.
 *
 * Kept free of I/O so the rules that matter — which keys exist, when a day
 * rolls over, when the budget is spent, when a percentage may be published —
 * are unit-testable without a Redis.
 */

/** Anonymous, site-wide vote tallies. Deliberately not per experiment: at
 *  realistic volumes a per-experiment split never reaches the publication
 *  threshold. */
export const VOTE_CORRECT_KEY = "votes:correct";
export const VOTE_INCORRECT_KEY = "votes:incorrect";

/** Below this many votes the stats page shows an empty state instead of a
 *  percentage. A number built on a handful of taps is the false precision
 *  this project exists to argue against. */
export const MIN_VOTES_TO_PUBLISH = 20;

/** Dedupe and rate-limit keys expire; they are technical, not analytical. */
export const VOTE_DEDUPE_TTL_S = 24 * 60 * 60;
export const WRITE_LIMIT_TTL_S = 60 * 60;

export type ErrorClass =
  | "config"
  | "refused"
  | "invalid_output"
  | "upstream"
  | "geo_upstream";

export function errorCounterKey(kind: ErrorClass): string {
  return `errors:${kind}`;
}

/** UTC day bucket. UTC rather than local time so a deploy region change never
 *  silently shifts when the budget resets. */
export function dayStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function budgetKey(now: Date): string {
  return `budget:${dayStamp(now)}`;
}

/** Benaderde unieke bezoekers van vandaag via een HyperLogLog-sketch: een
 *  probabilistische bitmap, nooit een lijst identifiers — respecteert "geen
 *  user content" (geen adres, geen per-event-tijdstip, alleen de sketch groeit). */
export function visitorsKey(now: Date): string {
  return `visitors:${dayStamp(now)}`;
}

/** Ruwe kostenraming per betaalde analyse (8-frame Opus-5-vision). De €0,10 uit
 *  de budget-comment hierboven was 3-5× te optimistisch; €0,40 is een veilige
 *  basis voor het admin-kostenoverzicht — indicatief, niet voor facturering. */
export const EUR_PER_ANALYSIS = 0.4;

export function voteDedupeKey(clientHash: string): string {
  return `vote-once:${clientHash}`;
}

export function writeLimitKey(clientHash: string): string {
  return `write-rate:${clientHash}`;
}

/** Default: ~300 analyses/day ≈ €30/day at ~€0,10 per analysis. */
export const DEFAULT_DAILY_ANALYSIS_BUDGET = 300;

export function dailyAnalysisBudget(): number {
  const raw = process.env.DAILY_ANALYSIS_BUDGET?.trim();
  if (!raw) return DEFAULT_DAILY_ANALYSIS_BUDGET;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DAILY_ANALYSIS_BUDGET;
  }
  return Math.floor(parsed);
}

/**
 * Verdict for one analysis request.
 *
 * `count` is the value *after* incrementing, or `null` when the store could not
 * answer. A null count allows the request: an unreachable store must not take
 * the site down, and the per-IP firewall rule plus the provider spend limit are
 * the other two layers of the same defence.
 */
export function budgetVerdict(
  count: number | null,
  limit: number,
): { allowed: boolean; exhausted: boolean } {
  if (count === null) return { allowed: true, exhausted: false };
  const exhausted = count > limit;
  return { allowed: !exhausted, exhausted };
}

/**
 * What the public stats page may claim.
 *
 * Below the threshold it reports the vote count and nothing else — the honest
 * statement is "not enough data yet", not a percentage.
 */
export function publishableStats(correct: number, incorrect: number): {
  total: number;
  percentage: number | null;
} {
  const total = Math.max(0, correct) + Math.max(0, incorrect);
  if (total < MIN_VOTES_TO_PUBLISH) return { total, percentage: null };
  return { total, percentage: Math.round((correct / total) * 100) };
}
