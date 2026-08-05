import { describe, expect, it } from "vitest";

import fixture from "./__fixtures__/pand-ouderkerk.json";
import {
  compassLabel,
  extractRoofPlanes,
  footprintRingsQuantized,
  planeFromRing,
  pointInRing,
  type CityJsonFeature,
  type Transform,
} from "./geometry";
import { ratingFor, solarScore } from "./solar";

const feature = fixture.feature as unknown as CityJsonFeature;
const transform = fixture.metadata.transform as Transform;

describe("extractRoofPlanes — echt 3D BAG-pand (zadeldak, Ouderkerk a/d Amstel)", () => {
  const planes = extractRoofPlanes(feature, transform);

  it("finds the seven roof planes, largest first", () => {
    expect(planes).toHaveLength(7);
    expect(planes[0].area).toBeGreaterThan(planes[1].area);
  });

  it("the two main gable faces are ~50° and face opposite directions", () => {
    const [a, b] = planes;
    expect(a.tilt).toBeGreaterThan(45);
    expect(a.tilt).toBeLessThan(55);
    expect(b.tilt).toBeGreaterThan(45);
    const diff = Math.abs((a.azimuth ?? 0) - (b.azimuth ?? 0));
    expect(Math.abs(diff - 180)).toBeLessThan(2); // tegenover elkaar
  });

  it("total roof area is plausible and flat parts have null azimuth", () => {
    const total = planes.reduce((s, p) => s + p.area, 0);
    expect(total).toBeGreaterThan(300);
    expect(total).toBeLessThan(400);
    for (const p of planes) {
      if (p.tilt < 5) expect(p.azimuth).toBeNull();
      else expect(p.azimuth).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("planeFromRing", () => {
  it("computes a south-facing 45° plane correctly", () => {
    // Vlak dat naar het zuiden (−y in RD) afloopt onder 45°.
    const p = planeFromRing([
      [0, 0, 0],
      [10, 0, 0],
      [10, 10, 10],
      [0, 10, 10],
    ]);
    expect(p).not.toBeNull();
    expect(p!.tilt).toBeCloseTo(45, 0);
    expect(p!.azimuth).toBeCloseTo(180, 0); // normaal wijst naar zuid
    expect(p!.area).toBeCloseTo(10 * Math.hypot(10, 10), 1);
  });

  it("returns null for degenerate rings", () => {
    expect(planeFromRing([[0, 0, 0], [1, 1, 1]])).toBeNull();
  });
});

describe("footprint + point-in-ring", () => {
  it("the building footprint contains its own centroid", () => {
    const rings = footprintRingsQuantized(feature);
    expect(rings.length).toBeGreaterThan(0);
    const ring = rings[0];
    const cx = ring.reduce((s, v) => s + v[0], 0) / ring.length;
    const cy = ring.reduce((s, v) => s + v[1], 0) / ring.length;
    expect(rings.some((r) => pointInRing(cx, cy, r))).toBe(true);
    expect(pointInRing(cx + 1e9, cy, ring)).toBe(false);
  });
});

describe("solarScore heuristiek (ankers uit NL-vuistregels)", () => {
  it("matches the rule-of-thumb anchors", () => {
    expect(solarScore(35, 180)).toBe(100); // zuid optimaal
    expect(solarScore(35, 90)).toBeGreaterThanOrEqual(80); // oost
    expect(solarScore(35, 90)).toBeLessThanOrEqual(90);
    expect(solarScore(0, null)).toBe(90); // plat
    expect(solarScore(35, 0)).toBeGreaterThanOrEqual(55); // noord
    expect(solarScore(35, 0)).toBeLessThanOrEqual(65);
  });

  it("steeper/flatter than 35° scores lower, symmetric directions equal", () => {
    expect(solarScore(70, 180)).toBeLessThan(solarScore(35, 180));
    expect(solarScore(35, 90)).toBeCloseTo(solarScore(35, 270), 0);
  });

  it("ratings map sensibly", () => {
    expect(ratingFor(100)).toBe("excellent");
    expect(ratingFor(80)).toBe("good");
    expect(ratingFor(65)).toBe("fair");
    expect(ratingFor(50)).toBe("limited");
  });

  it("compass labels", () => {
    expect(compassLabel(180)).toBe("S");
    expect(compassLabel(42)).toBe("NE");
    expect(compassLabel(null)).toBe("flat");
  });
});
