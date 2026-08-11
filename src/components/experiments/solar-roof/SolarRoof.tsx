"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  RATING_COLORS,
  RoofViewer,
} from "@/components/experiments/solar-roof/RoofViewer";
import { ShareResult } from "@/components/shared/ShareResult";
import { readAddressDeepLink } from "@/lib/deep-link";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { AnalysisSteps } from "@/components/shared/Progress";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextInput } from "@/components/ui/TextInput";
import { trackEvent } from "@/lib/analytics/events";
import { analyzeRoofRequest } from "@/lib/api-client";
import { compassLabel } from "@/lib/roof/geometry";
import type { RoofResult, SolarRating } from "@/types/roof";

type Phase =
  | { name: "idle" }
  | { name: "loading" }
  | { name: "result"; result: RoofResult; mock: boolean }
  | { name: "error"; message: string };

const STEPS = [
  "Looking up the address",
  "Finding the building in the BAG registry",
  "Fetching the national 3D LiDAR model",
  "Measuring roof planes",
];

const RATING_LABELS: Record<SolarRating, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  limited: "Limited",
};

/** Changing only the fragment does not reload the page, so the prefill has to
 *  listen: opening a second shared link in the same tab must show the second
 *  address, not the first. */
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readSharedAddress = () =>
  readAddressDeepLink(window.location.hash) ?? "";

/**
 * Experiment #004 — Solar Roof: Dutch address → the building's LoD 2.2 roof
 * from open aerial-LiDAR data (3D BAG / AHN), with per-plane orientation,
 * slope, area and an indicative solar score. No AI; only public data.
 */
export function SolarRoof() {
  // A shared link can carry an address in the URL *fragment*, which browsers
  // never send to the server — so a shared roof link cannot put an address in
  // our request logs.
  //
  // Read through useSyncExternalStore rather than a lazy useState initialiser:
  // the fragment does not exist during server rendering, and a plain
  // initialiser makes the prefill depend on hydration timing (it filled the
  // field on one run and left it empty on the next). Same pattern the AR check
  // in #003 uses for the same reason.
  //
  // Prefilled only — looking it up stays the visitor's decision, so a link can
  // never make someone's browser fire a request they did not ask for.
  const sharedAddress = useSyncExternalStore(
    subscribeToHash,
    readSharedAddress,
    () => "",
  );
  const [typed, setTyped] = useState<string | null>(null);
  const query = typed ?? sharedAddress;
  const setQuery = setTyped;
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  // Live WebGL canvas, handed over by the viewer for the share card.
  const roofCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (phase.name !== "loading") return;
    const t1 = setTimeout(() => setStepIndex(1), 1500);
    const t2 = setTimeout(() => setStepIndex(2), 4000);
    const t3 = setTimeout(() => setStepIndex(3), 20_000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase.name]);

  const analyze = useCallback(async (q: string) => {
    trackEvent("experiment_started");
    setStepIndex(0);
    setSelected(null);
    setPhase({ name: "loading" });
    try {
      const json = await analyzeRoofRequest(q);
      if (!json.ok) {
        setPhase({ name: "error", message: json.error });
        return;
      }
      trackEvent("analysis_completed");
      trackEvent("experiment_completed");
      setPhase({ name: "result", result: json.result, mock: json.mock });
    } catch {
      setPhase({
        name: "error",
        message:
          "The lookup took too long or the connection dropped. Please try again.",
      });
    }
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 3) analyze(q);
  };

  return (
    <div>
      {phase.name === "idle" && (
        <div>
          <Panel>
            <p className="text-[15px] leading-relaxed text-muted">
              The Dutch government has already scanned every roof in the country
              with aerial LiDAR — and the data is open. Type an address and see
              that roof in 3D, with the orientation, slope and an indicative
              solar score per roof plane.
            </p>
            <form onSubmit={submit} className="mt-6">
              <label htmlFor="roof-address" className="lab-label">
                Dutch address
              </label>
              <TextInput
                id="roof-address"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Streetname 1, City"
                maxLength={120}
                autoComplete="street-address"
                className="mt-2"
              />
              <Button
                type="submit"
                className="mt-4 min-h-13 w-full py-3.5 text-base"
                disabled={query.trim().length < 3}
              >
                Show my roof
              </Button>
            </form>
          </Panel>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            Uses open aerial-LiDAR data (3D BAG / AHN) — not your phone. The
            address is only forwarded to the public data services and never
            stored. Estimates, not measurements or yield promises.
          </p>
        </div>
      )}

      {phase.name === "loading" && (
        <Panel>
          <AnalysisSteps
            steps={STEPS}
            activeIndex={stepIndex}
            note="The national 3D dataset can be slow at busy moments — this can take up to a minute."
          />
        </Panel>
      )}

      {phase.name === "result" && (
        <div className="space-y-8">
          {phase.mock && (
            <p className="border border-accent bg-surface px-4 py-3 font-mono text-xs uppercase tracking-widest text-accent">
              Mock data — example building (development mode)
            </p>
          )}
          <section>
            <p className="lab-label">Roof of</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {phase.result.address}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {phase.result.roofType === "slanted"
                ? "Slanted roof"
                : phase.result.roofType === "horizontal"
                  ? "Flat roof"
                  : "Roof"}
              {phase.result.buildYear
                ? ` · built ${phase.result.buildYear}`
                : ""}
              {" · "}
              {phase.result.planes.length} roof{" "}
              {phase.result.planes.length === 1 ? "plane" : "planes"}
            </p>
          </section>

          {/* Phone: viewer above the list, as before. Large screens: side by
              side, so selecting a plane and seeing it highlighted happen in
              one glance instead of a scroll. */}
          <div className="space-y-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
            <RoofViewer
              planes={phase.result.planes}
              selected={selected}
              onCanvasReady={(c) => {
                roofCanvasRef.current = c;
              }}
            />

            <section>
              <p className="lab-label">Roof planes (indicative)</p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {phase.result.planes.slice(0, 8).map((p, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setSelected(selected === i ? null : i)}
                      className={`flex min-h-12 w-full items-center gap-3 px-2 text-left transition-colors ${
                        selected === i ? "bg-surface" : "hover:bg-surface"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{ background: RATING_COLORS[p.rating] }}
                      />
                      <span className="flex-1 text-sm">
                        {p.azimuth === null
                          ? "Flat section"
                          : `Facing ${compassLabel(p.azimuth)} · ${Math.round(p.tilt)}°`}
                        <span className="text-muted">
                          {" "}
                          · ≈{Math.round(p.area)} m²
                        </span>
                      </span>
                      <span className="lab-label shrink-0">
                        {RATING_LABELS[p.rating]} · {p.score}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-faint">
                Score 0–100 is an indicative relative yield (south ≈ 100). Flat
                sections assume racked panels.
              </p>
              <ShareResult
                className="mt-5"
                filename="spatiallab-solar-roof.png"
                buildSpec={async () => {
                  const canvas = roofCanvasRef.current;
                  if (!canvas || phase.name !== "result") return null;
                  const best = [...phase.result.planes].sort(
                    (a, b) => b.score - a.score,
                  )[0];
                  return {
                    experiment: "#004 Solar Roof",
                    headline: best
                      ? `Best roof plane scores ${best.score}/100`
                      : `${phase.result.planes.length} roof planes`,
                    detail: best
                      ? `${best.azimuth === null ? "Flat section" : `Facing ${compassLabel(best.azimuth)}, ${Math.round(best.tilt)}° tilt`} · ≈${Math.round(best.area)} m². Indicative only, from public building data — not a quote or an installation plan.`
                      : undefined,
                    hero: canvas,
                    heroSize: { width: canvas.width, height: canvas.height },
                  };
                }}
              />
            </section>
          </div>

          <section className="border-t border-line pt-5">
            <ul className="space-y-1">
              <li className="text-xs text-faint">
                — Based on open aerial LiDAR (3D BAG / AHN): a snapshot from the
                most recent national scan, not today.
              </li>
              <li className="text-xs text-faint">
                — Shade from trees, chimneys and neighbouring buildings is not
                included.
              </li>
              <li className="text-xs text-faint">
                — Indicative only: no kWh, cost or yield claims, and no
                statement about your roof&rsquo;s structural suitability — ask a
                professional installer.
              </li>
            </ul>
            <Button
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => {
                setQuery("");
                setPhase({ name: "idle" });
              }}
            >
              Try another address
            </Button>
          </section>
        </div>
      )}

      {phase.name === "error" && (
        <ErrorPanel
          title="No roof this time"
          message={phase.message}
          actions={[
            {
              label: "Try again",
              onClick: () =>
                query.trim().length >= 3
                  ? analyze(query)
                  : setPhase({ name: "idle" }),
            },
            {
              label: "Different address",
              onClick: () => setPhase({ name: "idle" }),
              variant: "secondary",
            },
          ]}
        />
      )}
    </div>
  );
}
