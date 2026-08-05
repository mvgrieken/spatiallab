"use client";

/** Indeterminate progress bar in the house style (respects reduced motion). */
export function IndeterminateBar() {
  return (
    <div className="relative h-1 w-full overflow-hidden bg-line">
      <div className="scan-sweep absolute h-full w-1/4 bg-accent" />
    </div>
  );
}

/**
 * Honest step list for a running AI analysis: shows what is happening
 * without simulating backend progress that isn't known.
 */
export function AnalysisSteps({
  steps,
  activeIndex,
  note,
}: {
  steps: string[];
  activeIndex: number;
  note?: string;
}) {
  return (
    <div aria-live="polite">
      <p className="lab-label">Analyzing</p>
      <div className="mt-4">
        <IndeterminateBar />
      </div>
      <ol className="mt-5 space-y-2">
        {steps.map((step, i) => (
          <li
            key={step}
            className={`flex items-baseline gap-3 text-sm transition-colors ${
              i === activeIndex
                ? "text-foreground"
                : i < activeIndex
                  ? "text-faint line-through decoration-line"
                  : "text-faint"
            }`}
          >
            <span className="font-mono text-xs">
              {i < activeIndex ? "✓" : i === activeIndex ? "●" : "○"}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {note && <p className="mt-5 text-xs text-faint">{note}</p>}
    </div>
  );
}
