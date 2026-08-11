import { FIT_OBJECTS, type FitObject } from "@/lib/fit/objects";
import type { SpotGoal } from "@/types/spot";

/**
 * Deep links: an experiment URL that arrives with its inputs already filled
 * in, so a shared link demonstrates something instead of showing an empty form.
 *
 * Two transports, deliberately different:
 *
 * - **#003** uses query parameters. Furniture dimensions are not sensitive.
 * - **#004** uses the URL *fragment* (`#address=…`). A fragment is never sent
 *   to the server, so a shared roof link cannot put someone's address into
 *   request logs. Putting it in the query string would undo the fix that moved
 *   the address out of the API URL in the first place.
 *
 * Invalid input is ignored rather than fatal: a mangled link should open a
 * working experiment with defaults, never an error page.
 */

export type FitDeepLink = {
  type?: FitObject;
  w?: number;
  d?: number;
  h?: number;
};

function positiveNumber(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
}

function isFitObject(value: string | null): value is FitObject {
  return value !== null && (FIT_OBJECTS as readonly string[]).includes(value);
}

/**
 * Read #003's parameters from a query string.
 *
 * The object type is part of the link on purpose: it decides the geometry and
 * the valid range for each dimension, so dimensions without a type would be
 * clamped against whatever happened to be selected.
 */
export function readFitDeepLink(search: string): FitDeepLink {
  const params = new URLSearchParams(search);
  const type = params.get("type");
  return {
    type: isFitObject(type) ? type : undefined,
    w: positiveNumber(params.get("w")),
    d: positiveNumber(params.get("d")),
    h: positiveNumber(params.get("h")),
  };
}

export function buildFitDeepLink(type: FitObject, dims: { w: number; d: number; h: number }): string {
  return `?type=${type}&w=${dims.w}&d=${dims.d}&h=${dims.h}`;
}

/** Read #004's address from a URL fragment, e.g. `#address=Dam%201%20Amsterdam`. */
export function readAddressDeepLink(hash: string): string | undefined {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const address = params.get("address")?.trim();
  if (!address || address.length < 3 || address.length > 120) return undefined;
  return address;
}

export function buildAddressDeepLink(address: string): string {
  return `#address=${encodeURIComponent(address.trim())}`;
}

/**
 * Which #002 goal has a counterpart in #003.
 *
 * Only two of the six do. #002 works out *where* something should go and
 * never learns how big it is — `SpotSuggestion` carries no dimensions at all
 * — so the link can hand over the object type and nothing more. The copy on
 * the button has to promise exactly that much and no more: a "with your
 * measurements" link that silently ships defaults would be a small lie in a
 * project that cannot afford one.
 */
const GOAL_TO_FIT_OBJECT: Partial<Record<SpotGoal, FitObject>> = {
  desk: "desk",
  storage: "closet",
};

export function fitObjectForGoal(goal: SpotGoal): FitObject | undefined {
  return GOAL_TO_FIT_OBJECT[goal];
}
