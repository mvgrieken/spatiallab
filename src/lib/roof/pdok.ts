import "server-only";

import {
  extractRoofPlanes,
  pointInRing,
  type CityJsonFeature,
  type Transform,
} from "@/lib/roof/geometry";
import { scorePlanes, type ScoredPlane } from "@/lib/roof/solar";

/**
 * Open-data pipeline for #004 Solar Roof:
 *   1. PDOK Locatieserver: address → RD point (fast, reliable)
 *   2. PDOK BAG WFS: small bbox → pand polygons → point-in-polygon → pand ID
 *   3. 3D BAG (TU Delft): one item fetch → LoD 2.2 roof geometry
 * Only public building data is involved; the address is forwarded to these
 * public APIs and never stored or logged by SpatialLab.
 */

export class RoofLookupError extends Error {
  constructor(
    message: string,
    readonly kind: "address" | "no_building" | "no_roof" | "upstream",
  ) {
    super(message);
    this.name = "RoofLookupError";
  }
}

async function getJson(url: string, tries = 3, timeoutMs = 25_000): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export type ResolvedAddress = { label: string; x: number; y: number };

/**
 * Below this Locatieserver relevance score, fuzzy matching is guessing:
 * measured ~4.9–7.2 for nonsense input vs ≥ 9.4 for real addresses.
 */
const MIN_ADDRESS_SCORE = 8.5;

export async function resolveAddress(query: string): Promise<ResolvedAddress> {
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(
    query,
  )}&fq=type:adres&rows=1&fl=weergavenaam,centroide_rd,score`;
  const json = (await getJson(url, 2, 10_000).catch(() => {
    throw new RoofLookupError("The address service is unavailable.", "upstream");
  })) as {
    response?: {
      docs?: Array<{ weergavenaam: string; centroide_rd: string; score: number }>;
    };
  };
  const doc = json.response?.docs?.[0];
  const match = doc?.centroide_rd?.match(/POINT\(([\d.]+) ([\d.]+)\)/);
  if (!doc || !match || doc.score < MIN_ADDRESS_SCORE) {
    throw new RoofLookupError(
      "No Dutch address found for this input — try street, number and place.",
      "address",
    );
  }
  return { label: doc.weergavenaam, x: Number(match[1]), y: Number(match[2]) };
}

type WfsPand = {
  properties: { identificatie: string; bouwjaar?: number };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
};

/** Find the BAG pand containing the RD point (fallback: nearest in bbox). */
export async function findPandId(x: number, y: number): Promise<string> {
  const d = 12;
  const url =
    "https://service.pdok.nl/kadaster/bag/wfs/v2_0?service=WFS&version=2.0.0" +
    "&request=GetFeature&typeNames=bag:pand&outputFormat=application/json" +
    `&count=25&srsName=EPSG:28992&bbox=${x - d},${y - d},${x + d},${y + d},urn:ogc:def:crs:EPSG::28992`;
  const json = (await getJson(url, 2, 12_000).catch(() => {
    throw new RoofLookupError("The building registry is unavailable.", "upstream");
  })) as { features?: WfsPand[] };
  const feats = json.features ?? [];
  if (feats.length === 0) {
    throw new RoofLookupError("No building found at this address.", "no_building");
  }
  const ringsOf = (f: WfsPand): number[][][] =>
    f.geometry.type === "Polygon"
      ? [(f.geometry.coordinates as number[][][])[0]]
      : (f.geometry.coordinates as number[][][][]).map((poly) => poly[0]);
  const hit = feats.find((f) => ringsOf(f).some((ring) => pointInRing(x, y, ring)));
  return (hit ?? feats[0]).properties.identificatie;
}

export type { RoofResult } from "@/types/roof";
import type { RoofResult } from "@/types/roof";

export async function fetchRoof(pandId: string): Promise<{
  planes: ScoredPlane[];
  roofType: string | null;
  buildYear: number | null;
}> {
  const url = `https://api.3dbag.nl/collections/pand/items/NL.IMBAG.Pand.${pandId}`;
  const json = (await getJson(url, 3, 30_000).catch(() => {
    throw new RoofLookupError(
      "The national 3D building model is slow or unavailable right now. Please try again in a minute.",
      "upstream",
    );
  })) as {
    feature?: CityJsonFeature;
    metadata?: { transform?: Transform };
  };
  const feature = json.feature;
  const transform = json.metadata?.transform;
  if (!feature || !transform) {
    throw new RoofLookupError(
      "This building is not covered by the 3D dataset.",
      "no_building",
    );
  }
  const planes = extractRoofPlanes(feature, transform).filter((p) => p.area >= 1);
  if (planes.length === 0) {
    throw new RoofLookupError(
      "No roof surfaces could be derived for this building.",
      "no_roof",
    );
  }
  const building = Object.values(feature.CityObjects).find(
    (o) => o.type === "Building",
  );
  const attrs = building?.attributes ?? {};
  return {
    planes: scorePlanes(planes),
    roofType: typeof attrs["b3_dak_type"] === "string" ? (attrs["b3_dak_type"] as string) : null,
    buildYear:
      typeof attrs["oorspronkelijkbouwjaar"] === "number"
        ? (attrs["oorspronkelijkbouwjaar"] as number)
        : null,
  };
}

export async function analyzeRoofByAddress(query: string): Promise<RoofResult> {
  const address = await resolveAddress(query);
  const pandId = await findPandId(address.x, address.y);
  const roof = await fetchRoof(pandId);
  return { address: address.label, pandId, ...roof };
}
