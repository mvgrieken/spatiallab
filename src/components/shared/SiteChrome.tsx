import Link from "next/link";

import { TesterEmailPrompt } from "./TesterEmailPrompt";

/** Shared header/footer chrome. */
const GITHUB_URL = "https://github.com/mvgrieken";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-3xl items-baseline justify-between px-5 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight">
            SpatialLab
          </span>
          <span className="lab-label">by AtThis</span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            href="/"
            className="lab-label transition-colors hover:text-foreground"
          >
            Experiments
          </Link>
          <Link
            href="/privacy"
            className="lab-label transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-8">
          <TesterEmailPrompt />
        </div>
        <p className="text-sm font-medium">SpatialLab by AtThis</p>
        {/* Site-wide: not every experiment uses AI (#003, #004 don't). */}
        <p className="mt-1 text-sm text-muted">
          Experimental output. Estimates are not measurements or professional
          advice.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <a
            href={GITHUB_URL}
            className="lab-label transition-colors hover:text-foreground"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <Link
            href="/stats"
            className="lab-label transition-colors hover:text-foreground"
          >
            Track record
          </Link>
          <Link
            href="/where-it-fails"
            className="lab-label transition-colors hover:text-foreground"
          >
            Where it fails
          </Link>
          <Link
            href="/privacy"
            className="lab-label transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
