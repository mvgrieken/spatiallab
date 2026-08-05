import type { ScoredPlane, SolarRating } from "@/lib/roof/solar";

/** Wire types for experiment #004 — Solar Roof. */

export type { ScoredPlane, SolarRating };

export type RoofResult = {
  /** Normalized display address (PDOK weergavenaam). */
  address: string;
  /** BAG pand identifier (public registry ID). */
  pandId: string;
  /** 3D BAG roof classification (e.g. "slanted"), when available. */
  roofType: string | null;
  buildYear: number | null;
  /** Roof planes, largest first, with indicative solar scores. */
  planes: ScoredPlane[];
};

export type RoofResponse =
  | { ok: true; result: RoofResult; mock: boolean }
  | { ok: false; error: string };
