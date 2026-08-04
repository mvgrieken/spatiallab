import { getAll } from "@vercel/edge-config";

import type { FlagBag } from "@/lib/killswitch";

/**
 * Edge Config flag reader with a short in-process cache — copied from the
 * shared atthis template (~/dev/killswitch/middleware/read-flags.ts).
 * Without an EDGE_CONFIG connection this fails open (null → app stays up).
 */

let cache: { at: number; flags: FlagBag } | null = null;
const TTL_MS = 10_000; // instant enough for an incident, cheap on request cost

export async function readFlags(): Promise<FlagBag> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.flags;
  try {
    const flags = (await getAll()) as FlagBag;
    cache = { at: now, flags };
    return flags;
  } catch {
    return null; // fail open
  }
}
