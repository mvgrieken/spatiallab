import { describe, expect, it } from "vitest";

import { appFlagKey, isBypassed, shouldKill } from "./killswitch";

describe("shouldKill", () => {
  it("true when the fleet flag is set", () => {
    expect(shouldKill({ killswitch: true }, "spatiallab")).toBe(true);
  });
  it("true when the per-app flag is set even if fleet is false", () => {
    expect(
      shouldKill({ killswitch: false, killswitch_spatiallab: true }, "spatiallab"),
    ).toBe(true);
  });
  it("false when neither flag is set", () => {
    expect(shouldKill({ killswitch: false }, "spatiallab")).toBe(false);
  });
  it("per-app key contains only characters Edge Config accepts", () => {
    expect(appFlagKey("spatiallab")).toBe("killswitch_spatiallab");
    expect(appFlagKey("spatiallab")).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("fails OPEN when the flag object is null (read failed)", () => {
    expect(shouldKill(null, "spatiallab")).toBe(false);
  });
});

describe("isBypassed", () => {
  it("bypasses configured prefixes", () => {
    expect(isBypassed("/api/cron/daily", ["/api/cron"])).toBe(true);
    expect(isBypassed("/dashboard", ["/api/cron"])).toBe(false);
  });
  it("does not over-match a longer sibling path", () => {
    expect(isBypassed("/api/crontab", ["/api/cron"])).toBe(false);
  });
});
