import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/shared/SiteChrome";
import type { Experiment } from "@/lib/experiments";

/**
 * The one shared shell every experiment page uses: number, title, subtitle,
 * back link, the experimental-output disclaimer and the site chrome.
 * Experiments only provide their interactive content as children.
 */
export function ExperimentLayout({
  experiment,
  children,
}: {
  experiment: Experiment;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:py-14">
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
        <p className="mt-10 border-t border-line pt-5 text-xs text-faint">
          Experimental AI output. Estimates are not measurements or
          professional advice.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
