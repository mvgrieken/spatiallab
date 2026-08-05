import "server-only";

import fixture from "@/lib/roof/__fixtures__/pand-ouderkerk.json";
import {
  extractRoofPlanes,
  type CityJsonFeature,
  type Transform,
} from "@/lib/roof/geometry";
import { scorePlanes } from "@/lib/roof/solar";
import type { RoofResult } from "@/types/roof";

/**
 * Development-only mock: the real Ouderkerk a/d Amstel test pand from the
 * fixture, so the whole UI works offline. Served only when `isMockMode()`.
 */
export function mockRoofResult(): RoofResult {
  const planes = extractRoofPlanes(
    fixture.feature as unknown as CityJsonFeature,
    fixture.metadata.transform as Transform,
  ).filter((p) => p.area >= 1);
  return {
    address: "Mockstraat 1, 0000 AA Voorbeeldstad (mock data)",
    pandId: "0437100000001758",
    roofType: "slanted",
    buildYear: 1939,
    planes: scorePlanes(planes),
  };
}
