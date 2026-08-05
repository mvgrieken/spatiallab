/**
 * Experiment #004 — Solar Roof.
 * Pure CityJSON → roof-plane math (unit-tested against a real 3D BAG pand).
 * All coordinates end up in RD/NAP meters; azimuth is compass degrees
 * (0 = north), tilt is degrees from horizontal.
 */

export type Transform = { scale: number[]; translate: number[] };

export type CityJsonFeature = {
  id?: string;
  vertices: number[][];
  CityObjects: Record<
    string,
    {
      type: string;
      attributes?: Record<string, unknown>;
      geometry?: Array<{
        type: string;
        lod: string | number;
        boundaries: unknown[];
        semantics?: {
          surfaces: Array<{ type: string }>;
          values: unknown[];
        };
      }>;
    }
  >;
};

export type RoofPlane = {
  /** m², true 3D surface area. */
  area: number;
  /** Degrees from horizontal; 0 = flat. */
  tilt: number;
  /** Compass degrees (0 = N, 90 = E); null for flat planes (< 5°). */
  azimuth: number | null;
  /** Vertices in meters (RD/NAP) for rendering. */
  ring: [number, number, number][];
};

export const FLAT_TILT_THRESHOLD = 5;

export function dequantize(
  vertices: number[][],
  { scale, translate }: Transform,
): [number, number, number][] {
  return vertices.map((v) => [
    v[0] * scale[0] + translate[0],
    v[1] * scale[1] + translate[1],
    v[2] * scale[2] + translate[2],
  ]);
}

/** Extract all LoD 2.2 roof planes from a CityJSON pand feature. */
export function extractRoofPlanes(
  feature: CityJsonFeature,
  transform: Transform,
): RoofPlane[] {
  const verts = dequantize(feature.vertices, transform);
  const planes: RoofPlane[] = [];

  for (const obj of Object.values(feature.CityObjects)) {
    for (const geom of obj.geometry ?? []) {
      if (String(geom.lod) !== "2.2" || !geom.semantics) continue;
      // Solid: [shell][face][ring][idx]; MultiSurface wrapped to match.
      const shells = (
        geom.type === "Solid" ? geom.boundaries : [geom.boundaries]
      ) as number[][][][];
      const values = (
        geom.type === "Solid" ? geom.semantics.values : [geom.semantics.values]
      ) as number[][];
      const types = geom.semantics.surfaces.map((s) => s.type);

      shells.forEach((shell, si) => {
        shell.forEach((face, fi) => {
          const surfIdx: number | undefined = values[si]?.[fi];
          if (surfIdx === undefined || types[surfIdx] !== "RoofSurface") return;
          const ring = face[0].map((i) => verts[i]);
          const plane = planeFromRing(ring);
          if (plane) planes.push(plane);
        });
      });
    }
  }
  return planes.sort((a, b) => b.area - a.area);
}

/** Newell-normal based area/orientation for one polygon ring. */
export function planeFromRing(ring: [number, number, number][]): RoofPlane | null {
  if (ring.length < 3) return null;
  let nx = 0,
    ny = 0,
    nz = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1, z1] = ring[i];
    const [x2, y2, z2] = ring[(i + 1) % ring.length];
    nx += (y1 - y2) * (z1 + z2);
    ny += (z1 - z2) * (x1 + x2);
    nz += (x1 - x2) * (y1 + y2);
  }
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-9) return null;
  const area = len / 2;
  const tilt = (Math.acos(Math.abs(nz) / len) * 180) / Math.PI;
  // Point the normal upward before deriving the compass direction.
  if (nz < 0) {
    nx = -nx;
    ny = -ny;
  }
  const azimuth =
    tilt < FLAT_TILT_THRESHOLD
      ? null
      : ((Math.atan2(nx, ny) * 180) / Math.PI + 360) % 360;
  return { area, tilt, azimuth, ring };
}

export function compassLabel(azimuth: number | null): string {
  if (azimuth === null) return "flat";
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return labels[Math.round(azimuth / 45) % 8];
}

/** Point-in-ring test in the quantized 2D space (uniform positive scale). */
export function pointInRing(
  px: number,
  py: number,
  ring: number[][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** LoD 0 footprint rings of the Building object, in quantized coordinates. */
export function footprintRingsQuantized(feature: CityJsonFeature): number[][][] {
  const building = Object.values(feature.CityObjects).find(
    (o) => o.type === "Building",
  );
  const g0 = building?.geometry?.find((g) => String(g.lod) === "0");
  if (!g0) return [];
  return (g0.boundaries as number[][][]).map((surface) =>
    surface[0].map((i) => feature.vertices[i]),
  );
}
