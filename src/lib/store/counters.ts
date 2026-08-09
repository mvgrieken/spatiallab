import "server-only";

import { createHash } from "node:crypto";

import {
  budgetKey,
  budgetVerdict,
  dailyAnalysisBudget,
  errorCounterKey,
  VOTE_CORRECT_KEY,
  VOTE_DEDUPE_TTL_S,
  VOTE_INCORRECT_KEY,
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

export function requestIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip");
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
    // INCR gaf niets terug. Als de store geconfigureerd is (productie) is dit een
    // outage: fail-CLOSED (S-001) — een betaalde, anonieme LLM-route mag niet
    // ongeteld doorlopen als de enige kostenrem wegvalt. Zonder config (lokaal/
    // dev) blijft het gedrag open zodat lokaal werken niet breekt.
    return storeConfigured()
      ? { allowed: false, exhausted: true, unavailable: true }
      : { allowed: true, exhausted: false };
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
