import { describe, expect, it } from "vitest";

import {
  buildAddressDeepLink,
  buildFitDeepLink,
  readAddressDeepLink,
  readFitDeepLink,
} from "./deep-link";

describe("readFitDeepLink", () => {
  it("reads a complete link", () => {
    expect(readFitDeepLink("?type=desk&w=140&d=70&h=75")).toEqual({
      type: "desk",
      w: 140,
      d: 70,
      h: 75,
    });
  });

  it("ignores an unknown object type instead of failing", () => {
    expect(readFitDeepLink("?type=spaceship&w=100").type).toBeUndefined();
  });

  it("ignores zero, negative and non-numeric dimensions", () => {
    const link = readFitDeepLink("?w=0&d=-5&h=abc");
    expect(link.w).toBeUndefined();
    expect(link.d).toBeUndefined();
    expect(link.h).toBeUndefined();
  });

  it("returns nothing at all for an empty query", () => {
    expect(readFitDeepLink("")).toEqual({
      type: undefined,
      w: undefined,
      d: undefined,
      h: undefined,
    });
  });

  it("round-trips what it builds", () => {
    const query = buildFitDeepLink("sofa", { w: 220, d: 90, h: 85 });
    expect(readFitDeepLink(query)).toEqual({
      type: "sofa",
      w: 220,
      d: 90,
      h: 85,
    });
  });
});

describe("readAddressDeepLink", () => {
  it("reads an address from the fragment", () => {
    expect(readAddressDeepLink("#address=Dam%201%20Amsterdam")).toBe(
      "Dam 1 Amsterdam",
    );
  });

  it("works without the leading hash", () => {
    expect(readAddressDeepLink("address=Dam%201")).toBe("Dam 1");
  });

  it("rejects too short and absurdly long values", () => {
    expect(readAddressDeepLink("#address=ab")).toBeUndefined();
    expect(readAddressDeepLink(`#address=${"a".repeat(200)}`)).toBeUndefined();
  });

  it("ignores a fragment that carries something else", () => {
    expect(readAddressDeepLink("#section=results")).toBeUndefined();
  });

  it("round-trips what it builds, including spaces and diacritics", () => {
    const hash = buildAddressDeepLink("Kerkstraat 12, 's-Hertogenbosch");
    expect(readAddressDeepLink(hash)).toBe("Kerkstraat 12, 's-Hertogenbosch");
  });
});
