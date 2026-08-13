import "server-only";

import { createHash } from "node:crypto";

import {
  budgetKey,
  budgetVerdict,
  dailyAnalysisBudget,
  errorCounterKey,
  EUR_PER_ANALYSIS,
  VOTE_CORRECT_KEY,
  VOTE_DEDUPE_TTL_S,
  VOTE_INCORRECT_KEY,
  visitorsKey,
  voteDedupeKey,
  WRITE_LIMIT_TTL_S,
  writeLimitKey,
  publishableStats,
  type ErrorClass,
} from "./keys";
import { redisCommand, redisPipeline, storeConfigured, toInteger } from "./redis";

/**
 * Everything SpatialLab persists, in one module: two vote tallies, one daily
 * analysis counter, one counter per error class, and short-lived keys that
 * stop a single client from voting twice or hammering the write endpoint.
 *
 * No function here throws, and none of them may be awaited on a path that the
 * user is waiting for an answer on.
 */

/**
 * Derive a short, opaque client key from the request IP.
 *
 * Salted with a server secret so the value cannot be reversed into an address,
 * and only ever used as a Redis key with a TTL — never stored alongside a vote,
 * never logged, and gone within 24 hours.
 */
export function clientHash(ip: string | null): string {
  const salt = process.env.CLIENT_HASH_SALT?.trim() || "spatiallab-dev-salt";
  return createHash("sha256")
    .update(`${salt}:${ip ?? "unknown"}`)
    .digest("hex")
    .slice(0, 24);
}

/**
 * Opake sleutel per e-mailadres, gezouten met dezelfde server-salt als
 * clientHash — voor de per-adres-limiet op de mail-endpoints, zodat één adres
 * niet gebombardeerd kan worden, óók niet vanaf verspreide IP's. Nooit naast
 * een waarde opgeslagen; alleen als Redis-sleutel met TTL.
 */
export function addressHash(email: string): string {
  const salt = process.env.CLIENT_HASH_SALT?.trim() || "spatiallab-dev-salt";
  return createHash("sha256")
    .update(`addr:${salt}:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 24);
}

/**
 * Het IP van de bezoeker, of null als het niet te bepalen is.
 *
 * `x-forwarded-for` is een kommalijst waarvan de client het BEGIN zelf kan
 * vullen; achter Vercel (precies één vertrouwde hop) is de LAATSTE waarde die
 * welke Vercel zelf toevoegde — de betrouwbare. Het eerste element pakken laat
 * een aanvaller per verzoek een ander "IP" kiezen en zo de dedupe én rate-limit
 * omzeilen. Fleet-conventie, gelijk aan `platform/src/lib/rate-limit.ts`.
 */
export function requestIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return stripPort(last);
  }
  const realIp = headers.get("x-real-ip")?.trim();
  return realIp ? stripPort(realIp) : null;
}

/** '1.2.3.4:5678' → '1.2.3.4'; '[::1]:5678' → '::1'. */
function stripPort(value: string): string {
  const bracket = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracket) return bracket[1];
  const withPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (withPort) return withPort[1];
  return value;
}

export type Vote = "correct" | "incorrect";

/**
 * Record one vote. Returns silently in every failure case — a visitor must
 * never learn that the store is down, and must never be blocked by it.
 */
export async function recordVote(vote: Vote, hash: string): Promise<void> {
  // SET NX: the first caller wins, later ones are no-ops until the key expires.
  const claimed = await redisCommand([
    "SET",
    voteDedupeKey(hash),
    "1",
    "NX",
    "EX",
    String(VOTE_DEDUPE_TTL_S),
  ]);
  if (claimed === null) return; // unconfigured, unreachable, or already voted

  await redisCommand([
    "INCR",
    vote === "correct" ? VOTE_CORRECT_KEY : VOTE_INCORRECT_KEY,
  ]);
}

/** Coarse write limit on the feedback endpoint, independent of the firewall
 *  rule: a scripted client should not be able to move the public number. */
export async function allowWrite(hash: string, max: number): Promise<boolean> {
  const key = writeLimitKey(hash);
  const count = toInteger(await redisCommand(["INCR", key]));
  if (count === null) return true; // store unavailable → do not block
  if (count === 1) {
    await redisCommand(["EXPIRE", key, String(WRITE_LIMIT_TTL_S)]);
  }
  return count <= max;
}

/**
 * Abuse-guard voor de mail-versturende endpoints (toegangslink, tester-opt-in).
 * Telt deze actie onder `ns:id` en zegt of hij nog mag. Toepassen per IP ÉN per
 * doeladres dekt zowel scripted spam als slachtoffer-gericht mailbombarderen
 * vanaf verspreide IP's.
 *
 * Fail-CLOSED in productie wanneer de store geconfigureerd-maar-onbereikbaar is
 * (net als de budget-cap, CSO-F2): een mail-endpoint mag bij een outage niet
 * stilletjes weer een open cannon worden. Lokaal/onbeconfigureerd → toestaan,
 * zodat dev werkt.
 */
export async function allowMailAction(
  ns: string,
  id: string,
  max: number,
  ttlSeconds: number,
): Promise<boolean> {
  const key = `${ns}:${id}`;
  const count = toInteger(await redisCommand(["INCR", key]));
  if (count === null) {
    if (storeConfigured() || process.env.NODE_ENV === "production") return false;
    return true;
  }
  if (count === 1) {
    await redisCommand(["EXPIRE", key, String(ttlSeconds)]);
  }
  return count <= max;
}

export async function readVoteStats(): Promise<{
  total: number;
  percentage: number | null;
  available: boolean;
}> {
  const results = await redisPipeline([
    ["GET", VOTE_CORRECT_KEY],
    ["GET", VOTE_INCORRECT_KEY],
  ]);
  if (!results) return { total: 0, percentage: null, available: false };

  const correct = toInteger(results[0]) ?? 0;
  const incorrect = toInteger(results[1]) ?? 0;
  return { ...publishableStats(correct, incorrect), available: true };
}

/**
 * Count one analysis against today's budget and say whether it may proceed.
 *
 * Called from the API routes, never from the proxy: the proxy runs on every
 * request including static pages, and this check is only needed on the handful
 * of routes that actually cost money.
 */
export async function consumeAnalysisBudget(): Promise<{
  allowed: boolean;
  exhausted: boolean;
  /** True als de counter-store onbereikbaar is terwijl hij WEL geconfigureerd is. */
  unavailable?: boolean;
}> {
  const key = budgetKey(new Date());
  const count = toInteger(await redisCommand(["INCR", key]));
  if (count === null) {
    // INCR gaf niets terug. Twee gevallen, beide fail-CLOSED in productie:
    //  (a) store geconfigureerd maar onbereikbaar = outage (S-001);
    //  (b) store NIET geconfigureerd terwijl NODE_ENV=production = misconfig
    //      (CSO-F2) — zonder deze tak liep de kosten-cap in prod stil fail-OPEN
    //      bij een ontbrekende/ver-typte UPSTASH_*-env → onbeperkte anonieme
    //      Opus-5-calls in launch-mode. Alleen lokaal/dev (geen config, niet-prod)
    //      blijft open zodat lokaal werken niet breekt.
    if (storeConfigured() || process.env.NODE_ENV === "production") {
      return { allowed: false, exhausted: true, unavailable: true };
    }
    return { allowed: true, exhausted: false };
  }
  if (count === 1) {
    // Expire two days out: the key only needs to outlive its own UTC day.
    await redisCommand(["EXPIRE", key, String(48 * 60 * 60)]);
  }
  return budgetVerdict(count, dailyAnalysisBudget());
}

/**
 * Tally one failure by class, so "the launch went badly" can be told apart
 * from "an endpoint was broken".
 *
 * Awaited rather than fired and forgotten: a serverless instance can freeze
 * before a floating promise resolves, and this only ever runs on a path that
 * is already returning an error.
 */
export async function countError(kind: ErrorClass): Promise<void> {
  await redisCommand(["INCR", errorCounterKey(kind)]);
}

/** Alle foutklassen, voor het admin-overzicht. Houd in de pas met ErrorClass. */
const ERROR_CLASSES: ErrorClass[] = [
  "config",
  "refused",
  "invalid_output",
  "upstream",
  "geo_upstream",
];

/**
 * Tel deze bezoeker mee in de unieke-bezoekers-schatting van vandaag (HLL).
 * Slaat geen identifier op — alleen de sketch groeit. Faalt stil (de store-
 * helpers geven bij uitval null terug). Eén round-trip: sketch bijwerken + de
 * dag-sketch laten verlopen (NX, dus alleen de eerste keer).
 */
export async function recordVisitor(hash: string): Promise<void> {
  const key = visitorsKey(new Date());
  await redisPipeline([
    ["PFADD", key, hash],
    ["EXPIRE", key, String(48 * 60 * 60), "NX"],
  ]);
}

export type DailyOverview = {
  available: boolean;
  analysesToday: number;
  budget: number;
  remaining: number;
  estCostEur: number;
  uniqueVisitors: number;
  votes: { total: number; percentage: number | null };
  errors: Record<ErrorClass, number>;
};

/**
 * Dagoverzicht voor de admin: kosten (analyses × raming), budget, unieke
 * bezoekers (HLL), stemmen en fouten. Read-only; alle waarden zijn site-brede
 * dag-aggregaten, nóóit per gebruiker.
 */
export async function readDailyOverview(): Promise<DailyOverview> {
  const now = new Date();
  const budget = dailyAnalysisBudget();
  const zeroErrors = Object.fromEntries(ERROR_CLASSES.map((k) => [k, 0])) as Record<
    ErrorClass,
    number
  >;
  const empty: DailyOverview = {
    available: false,
    analysesToday: 0,
    budget,
    remaining: budget,
    estCostEur: 0,
    uniqueVisitors: 0,
    votes: { total: 0, percentage: null },
    errors: zeroErrors,
  };

  const results = await redisPipeline([
    ["GET", budgetKey(now)],
    ["PFCOUNT", visitorsKey(now)],
    ["GET", VOTE_CORRECT_KEY],
    ["GET", VOTE_INCORRECT_KEY],
    ...ERROR_CLASSES.map((k) => ["GET", errorCounterKey(k)]),
  ]);
  if (!results) return empty;

  const analysesToday = toInteger(results[0]) ?? 0;
  const uniqueVisitors = toInteger(results[1]) ?? 0;
  const correct = toInteger(results[2]) ?? 0;
  const incorrect = toInteger(results[3]) ?? 0;
  const errors = Object.fromEntries(
    ERROR_CLASSES.map((k, i) => [k, toInteger(results[4 + i]) ?? 0]),
  ) as Record<ErrorClass, number>;

  return {
    available: true,
    analysesToday,
    budget,
    remaining: Math.max(0, budget - analysesToday),
    estCostEur: Math.round(analysesToday * EUR_PER_ANALYSIS * 100) / 100,
    uniqueVisitors,
    votes: publishableStats(correct, incorrect),
    errors,
  };
}
