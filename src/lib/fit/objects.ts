/**
 * Experiment #003 — Does It Fit?
 * Parametric furniture built from plain cuboids. Pure data (unit-tested);
 * the component turns these into three.js meshes and a USDZ export.
 * All dimensions in meters; floor at y = 0; y is up (AR Quick Look).
 */

export const FIT_OBJECTS = ["closet", "desk", "table", "sofa", "fridge"] as const;
export type FitObject = (typeof FIT_OBJECTS)[number];

export type Dims = { w: number; h: number; d: number };

/** One axis-aligned cuboid: center position + size, meters. */
export type Box = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
};

type ObjectSpec = {
  label: string;
  /** Sensible default, cm. */
  defaults: { w: number; h: number; d: number };
  /** Allowed range per axis, cm (honest bounds, no absurd objects). */
  range: { w: [number, number]; h: [number, number]; d: [number, number] };
};

export const FIT_OBJECT_SPECS: Record<FitObject, ObjectSpec> = {
  closet: {
    label: "Closet",
    defaults: { w: 90, h: 200, d: 45 },
    range: { w: [40, 300], h: [40, 280], d: [20, 100] },
  },
  desk: {
    label: "Desk",
    defaults: { w: 140, h: 75, d: 70 },
    range: { w: [60, 250], h: [55, 120], d: [40, 100] },
  },
  table: {
    label: "Table",
    defaults: { w: 180, h: 75, d: 90 },
    range: { w: [50, 300], h: [50, 110], d: [50, 150] },
  },
  sofa: {
    label: "Sofa",
    defaults: { w: 220, h: 85, d: 95 },
    range: { w: [120, 400], h: [60, 120], d: [70, 120] },
  },
  fridge: {
    label: "Fridge",
    defaults: { w: 60, h: 185, d: 65 },
    range: { w: [45, 120], h: [80, 220], d: [45, 90] },
  },
};

/** Clamp centimeter input to the object's honest range. */
export function clampDimsCm(
  type: FitObject,
  dims: { w: number; h: number; d: number },
): { w: number; h: number; d: number } {
  const { range } = FIT_OBJECT_SPECS[type];
  const clamp = (v: number, [lo, hi]: [number, number]) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : lo;
  return {
    w: clamp(dims.w, range.w),
    h: clamp(dims.h, range.h),
    d: clamp(dims.d, range.d),
  };
}

/**
 * Build the cuboids for an object with outer dimensions `dims` (meters).
 * Invariant (tested): the union's bounding box equals exactly w × h × d,
 * standing on the floor (min y = 0) and centered on x/z.
 */
export function buildObjectBoxes(type: FitObject, dims: Dims): Box[] {
  const { w, h, d } = dims;
  switch (type) {
    case "closet":
    case "fridge":
      return [{ x: 0, y: h / 2, z: 0, w, h, d }];

    case "desk":
    case "table": {
      const top = type === "desk" ? 0.03 : 0.04;
      const leg = Math.min(type === "desk" ? 0.05 : 0.06, w / 4, d / 4);
      const inset = leg / 2;
      const legH = h - top;
      const lx = w / 2 - inset;
      const lz = d / 2 - inset;
      return [
        { x: 0, y: h - top / 2, z: 0, w, h: top, d },
        { x: -lx, y: legH / 2, z: -lz, w: leg, h: legH, d: leg },
        { x: lx, y: legH / 2, z: -lz, w: leg, h: legH, d: leg },
        { x: -lx, y: legH / 2, z: lz, w: leg, h: legH, d: leg },
        { x: lx, y: legH / 2, z: lz, w: leg, h: legH, d: leg },
      ];
    }

    case "sofa": {
      const baseH = h * 0.45;
      const backD = Math.min(d * 0.25, 0.3);
      return [
        { x: 0, y: baseH / 2, z: 0, w, h: baseH, d },
        {
          x: 0,
          y: baseH + (h - baseH) / 2,
          z: -(d / 2 - backD / 2),
          w,
          h: h - baseH,
          d: backD,
        },
      ];
    }
  }
}

/** Bounding box of a set of boxes — used by tests and the preview camera. */
export function boundsOf(boxes: Box[]): {
  min: [number, number, number];
  max: [number, number, number];
} {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) {
    min[0] = Math.min(min[0], b.x - b.w / 2);
    min[1] = Math.min(min[1], b.y - b.h / 2);
    min[2] = Math.min(min[2], b.z - b.d / 2);
    max[0] = Math.max(max[0], b.x + b.w / 2);
    max[1] = Math.max(max[1], b.y + b.h / 2);
    max[2] = Math.max(max[2], b.z + b.d / 2);
  }
  return { min, max };
}
