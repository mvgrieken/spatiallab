import { describe, expect, it } from "vitest";

import {
  budgetKey,
  budgetVerdict,
  dayStamp,
  MIN_VOTES_TO_PUBLISH,
  publishableStats,
} from "./keys";

describe("dayStamp", () => {
  it("buckets by UTC date", () => {
    expect(dayStamp(new Date("2026-08-06T14:44:00Z"))).toBe("2026-08-06");
    expect(budgetKey(new Date("2026-08-06T14:44:00Z"))).toBe("budget:2026-08-06");
  });
  it("rolls over at UTC midnight, not local midnight", () => {
    expect(dayStamp(new Date("2026-08-06T23:59:59Z"))).toBe("2026-08-06");
    expect(dayStamp(new Date("2026-08-07T00:00:00Z"))).toBe("2026-08-07");
  });
});

describe("budgetVerdict", () => {
  it("allows while under the limit", () => {
    expect(budgetVerdict(1, 300)).toEqual({ allowed: true, exhausted: false });
    expect(budgetVerdict(300, 300)).toEqual({ allowed: true, exhausted: false });
  });
  it("blocks the request that goes past the limit", () => {
    expect(budgetVerdict(301, 300)).toEqual({ allowed: false, exhausted: true });
  });
  it("fails OPEN when the store could not answer", () => {
    // An unreachable counter store must never take the site down; the firewall
    // rule and the provider spend limit are the other two layers.
    expect(budgetVerdict(null, 300)).toEqual({ allowed: true, exhausted: false });
  });
});

describe("publishableStats", () => {
  it("withholds a percentage below the threshold", () => {
    const stats = publishableStats(7, 2);
    expect(stats.total).toBe(9);
    expect(stats.percentage).toBeNull();
  });
  it("publishes once the threshold is reached", () => {
    const stats = publishableStats(15, 5);
    expect(stats.total).toBe(MIN_VOTES_TO_PUBLISH);
    expect(stats.percentage).toBe(75);
  });
  it("reports zero votes without dividing by zero", () => {
    expect(publishableStats(0, 0)).toEqual({ total: 0, percentage: null });
  });
  it("ignores negative counts from a corrupted read", () => {
    expect(publishableStats(-5, -5)).toEqual({ total: 0, percentage: null });
  });
});
