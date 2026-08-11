import { describe, it, expect, beforeEach } from "vitest";

import { signAccessToken, verifyAccessToken } from "./access-link";

beforeEach(() => {
  process.env.ACCESS_LINK_SECRET = "test-secret-123";
  delete process.env.NEXTAUTH_SECRET;
});

describe("access-link", () => {
  it("roundtrip: een geldig token verifieert naar het e-mailadres", async () => {
    const t = await signAccessToken("a@b.nl");
    expect(t).toBeTruthy();
    expect(await verifyAccessToken(t!)).toBe("a@b.nl");
  });

  it("null zonder secret", async () => {
    delete process.env.ACCESS_LINK_SECRET;
    expect(await signAccessToken("a@b.nl")).toBeNull();
    expect(await verifyAccessToken("x.y")).toBeNull();
  });

  it("een verlopen token wordt geweigerd", async () => {
    const t = await signAccessToken("a@b.nl", 1000, 0); // exp = 1000ms epoch
    expect(await verifyAccessToken(t!, 2000)).toBeNull(); // now voorbij exp
    expect(await verifyAccessToken(t!, 500)).toBe("a@b.nl"); // now vóór exp
  });

  it("een gemanipuleerd token wordt geweigerd", async () => {
    const t = await signAccessToken("a@b.nl");
    const tampered = t!.slice(0, -3) + (t!.slice(-3) === "aaa" ? "bbb" : "aaa");
    expect(await verifyAccessToken(tampered)).toBeNull();
  });

  it("een token dat met een ander secret is getekend, verifieert niet", async () => {
    const t = await signAccessToken("a@b.nl");
    process.env.ACCESS_LINK_SECRET = "ander-secret";
    expect(await verifyAccessToken(t!)).toBeNull();
  });

  it("rommel-input geeft null, geen exception", async () => {
    expect(await verifyAccessToken(undefined)).toBeNull();
    expect(await verifyAccessToken("geen-punt")).toBeNull();
    expect(await verifyAccessToken(".")).toBeNull();
  });
});
