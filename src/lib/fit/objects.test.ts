import { describe, expect, it } from "vitest";

import {
  boundsOf,
  buildObjectBoxes,
  clampDimsCm,
  FIT_OBJECT_SPECS,
  FIT_OBJECTS,
} from "./objects";

describe("clampDimsCm", () => {
  it("keeps in-range values and rounds them", () => {
    expect(clampDimsCm("closet", { w: 90.4, h: 200, d: 45 })).toEqual({
      w: 90,
      h: 200,
      d: 45,
    });
  });

  it("clamps out-of-range and non-finite values", () => {
    expect(clampDimsCm("closet", { w: 5000, h: -10, d: NaN })).toEqual({
      w: 300,
      h: 40,
      d: 20,
    });
  });
});

describe("buildObjectBoxes", () => {
  it.each(FIT_OBJECTS)(
    "%s: bounding box equals requested dims, standing on the floor",
    (type) => {
      const { defaults } = FIT_OBJECT_SPECS[type];
      const dims = { w: defaults.w / 100, h: defaults.h / 100, d: defaults.d / 100 };
      const boxes = buildObjectBoxes(type, dims);
      const { min, max } = boundsOf(boxes);
      expect(max[0] - min[0]).toBeCloseTo(dims.w, 5);
      expect(max[1] - min[1]).toBeCloseTo(dims.h, 5);
      expect(max[2] - min[2]).toBeCloseTo(dims.d, 5);
      expect(min[1]).toBeCloseTo(0, 5); // op de vloer
      expect(min[0]).toBeCloseTo(-dims.w / 2, 5); // gecentreerd
      expect(min[2]).toBeCloseTo(-dims.d / 2, 5);
    },
  );

  it("desk has a top and four legs", () => {
    const boxes = buildObjectBoxes("desk", { w: 1.4, h: 0.75, d: 0.7 });
    expect(boxes).toHaveLength(5);
    const [top, ...legs] = boxes;
    expect(top.y).toBeGreaterThan(0.7);
    for (const leg of legs) expect(leg.h).toBeCloseTo(0.75 - 0.03, 5);
  });

  it("legs stay sane on tiny tables (never wider than the top)", () => {
    const boxes = buildObjectBoxes("table", { w: 0.5, h: 0.5, d: 0.5 });
    const { min, max } = boundsOf(boxes);
    expect(max[0] - min[0]).toBeCloseTo(0.5, 5);
    for (const b of boxes) expect(b.w).toBeLessThanOrEqual(0.5);
  });

  it("sofa backrest sits at the rear within the depth", () => {
    const boxes = buildObjectBoxes("sofa", { w: 2.2, h: 0.85, d: 0.95 });
    expect(boxes).toHaveLength(2);
    const back = boxes[1];
    expect(back.z).toBeLessThan(0);
    const { min, max } = boundsOf(boxes);
    expect(max[2] - min[2]).toBeCloseTo(0.95, 5);
  });
});
