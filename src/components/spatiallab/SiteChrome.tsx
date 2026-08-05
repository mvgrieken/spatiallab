import Link from "next/link";

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
            href={GITHUB_URL}
            className="lab-label transition-colors hover:text-foreground"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
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
