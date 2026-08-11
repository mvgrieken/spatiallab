import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/shared/SiteChrome";
import { DEFAULT_DISCLAIMER, type Experiment } from "@/lib/experiments";

/**
 * The one shared shell every experiment page uses: number, title, subtitle,
 * back link, the experimental-output disclaimer and the site chrome.
 * Experiments only provide their interactive content as children.
 */
export function ExperimentLayout({
  experiment,
  children,
  wide = false,
}: {
  experiment: Experiment;
  children: React.ReactNode;
  /** Widen the column on large screens. Only for experiments that gain
   *  something from it — #004 puts its address form beside the 3D roof. The
   *  narrow column stays the default because every experiment is designed for
   *  a phone first. */
  wide?: boolean;
}) {
  return (
    <>
      <SiteHeader />
      <main
        className={`mx-auto w-full flex-1 px-5 py-10 sm:py-14 ${
          wide ? "max-w-xl lg:max-w-5xl" : "max-w-xl"
        }`}
      >
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-xs text-accent">
            Experiment #{experiment.id}
          </p>
          <Link
            href="/"
            className="lab-label transition-colors hover:text-foreground"
          >
            ← All experiments
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {experiment.title}
        </h1>
        {experiment.subtitle && (
          <p className="mt-2 text-lg text-muted">{experiment.subtitle}</p>
        )}
        <div className="mt-8">{children}</div>
        <div className="mt-10 border-t border-line pt-5">
          <Link
            href={`/how/${experiment.slug}`}
            className="lab-label transition-colors hover:text-foreground"
          >
            How this works, and where it fails →
          </Link>
          <p className="mt-4 text-xs text-faint">
            {experiment.disclaimer ?? DEFAULT_DISCLAIMER}
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
