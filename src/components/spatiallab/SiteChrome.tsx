import Link from "next/link";

/**
 * Shared header/footer chrome. The GitHub and LinkedIn URLs below are
 * placeholders — replace PLACEHOLDER_GITHUB_URL / PLACEHOLDER_LINKEDIN_URL
 * (documented in README → Placeholders).
 */
export const PLACEHOLDER_GITHUB_URL = "https://github.com/mvgrieken";
export const PLACEHOLDER_LINKEDIN_URL = "https://www.linkedin.com/";

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
            href="/experiments/ask-your-room"
            className="lab-label transition-colors hover:text-foreground"
          >
            #001
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
        <p className="text-sm font-medium">SpatialLab by AtThis</p>
        <p className="mt-1 text-sm text-muted">
          Experimental AI output. Estimates are not measurements or
          professional advice.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <a
            href={PLACEHOLDER_GITHUB_URL}
            className="lab-label transition-colors hover:text-foreground"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            href={PLACEHOLDER_LINKEDIN_URL}
            className="lab-label transition-colors hover:text-foreground"
            rel="noopener noreferrer"
            target="_blank"
          >
            LinkedIn
          </a>
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
