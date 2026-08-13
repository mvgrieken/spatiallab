import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addressHash, requestIp } from "./counters";

describe("requestIp — fleet-conventie: laatste XFF-hop", () => {
  const h = (init: Record<string, string>) => new Headers(init);

  it("pakt de LAATSTE hop van x-forwarded-for (de door Vercel toegevoegde), niet de eerste", () => {
    // De client kan "1.2.3.4" zelf vooraan zetten; de vertrouwde hop staat achteraan.
    expect(requestIp(h({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("strookt de poort van IPv4 en IPv6", () => {
    expect(requestIp(h({ "x-forwarded-for": "9.9.9.9:5678" }))).toBe("9.9.9.9");
    expect(requestIp(h({ "x-forwarded-for": "[2001:db8::1]:443" }))).toBe("2001:db8::1");
  });

  it("valt terug op x-real-ip wanneer XFF ontbreekt", () => {
    expect(requestIp(h({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
  });

  it("is null zonder bruikbare header", () => {
    expect(requestIp(h({}))).toBeNull();
  });

  it("een gespooft eerste XFF-element verandert de sleutel NIET (dedupe/limiet blijft intact)", () => {
    const a = requestIp(h({ "x-forwarded-for": "5.5.5.5, 9.9.9.9" }));
    const b = requestIp(h({ "x-forwarded-for": "6.6.6.6, 9.9.9.9" }));
    expect(a).toBe(b);
    expect(a).toBe("9.9.9.9");
  });
});

describe("addressHash", () => {
  it("is deterministisch en hoofdletterongevoelig", () => {
    expect(addressHash("A@B.com")).toBe(addressHash("a@b.com"));
  });

  it("verschilt per adres en lekt het adres niet", () => {
    const hashed = addressHash("a@b.com");
    expect(hashed).not.toBe(addressHash("c@d.com"));
    expect(hashed).not.toContain("a@b.com");
    expect(hashed).toMatch(/^[0-9a-f]{24}$/);
  });
});

describe("allowMailAction", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.doUnmock("./redis"));

  it("staat toe t/m max, blokkeert daarna, en zet de TTL op de eerste hit", async () => {
    const calls: string[][] = [];
    let n = 0;
    vi.doMock("./redis", async () => {
      const actual = await vi.importActual<typeof import("./redis")>("./redis");
      return {
        ...actual,
        redisCommand: vi.fn(async (args: string[]) => {
          calls.push(args);
          return args[0] === "INCR" ? ++n : "OK";
        }),
        storeConfigured: () => true,
      };
    });
    const { allowMailAction } = await import("./counters");

    expect(await allowMailAction("t", "id", 2, 60)).toBe(true); // 1
    expect(await allowMailAction("t", "id", 2, 60)).toBe(true); // 2
    expect(await allowMailAction("t", "id", 2, 60)).toBe(false); // 3 > 2
    expect(calls.filter((c) => c[0] === "EXPIRE")).toHaveLength(1);
  });

  it("faalt CLOSED (false) als de store geconfigureerd-maar-onbereikbaar is", async () => {
    vi.doMock("./redis", async () => {
      const actual = await vi.importActual<typeof import("./redis")>("./redis");
      return {
        ...actual,
        redisCommand: vi.fn(async () => null),
        storeConfigured: () => true,
      };
    });
    const { allowMailAction } = await import("./counters");
    expect(await allowMailAction("t", "id", 5, 60)).toBe(false);
  });
});
