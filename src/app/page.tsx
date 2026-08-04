import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/spatiallab/SiteChrome";

const traits = [
  "Works in Safari",
  "No app required",
  "No SpatialLab image database",
  "Estimates, not measurements",
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5">
        {/* Hero */}
        <section className="survey-grid -mx-5 border-b border-line px-5 pb-14 pt-16 sm:pb-20 sm:pt-24">
          <p className="lab-label fade-up">Field notes on machine perception</p>
          <h1 className="fade-up fade-up-1 mt-4 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            Spatial
            <span className="text-accent">Lab</span>
          </h1>
          <p className="fade-up fade-up-2 mt-5 max-w-md text-lg leading-snug text-muted sm:text-xl">
            Small experiments exploring how AI understands the physical world.
          </p>
          <p className="fade-up fade-up-3 mt-6 max-w-lg text-[15px] leading-relaxed text-muted">
            SpatialLab is a series of small, working browser experiments about
            what AI can infer from the physical world — from a camera image, a
            sound or an address. No app. No account. Open and try.
          </p>
        </section>

        {/* Experiment card */}
        <section className="py-12 sm:py-16">
          <div className="flex items-baseline justify-between">
            <h2 className="lab-label">Experiments</h2>
            <span className="lab-label">01 / 01</span>
          </div>
          <Link
            href="/experiments/ask-your-room"
            className="group mt-4 block border border-line bg-surface transition-colors hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-4 p-5 sm:p-7">
              <div>
                <p className="font-mono text-xs text-accent">#001</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Ask Your Room
                </h3>
                <p className="mt-2 text-[15px] text-muted">
                  Film your room. Ask it a question.
                </p>
              </div>
              <span
                aria-hidden
                className="mt-1 font-mono text-xl text-faint transition-transform group-hover:translate-x-1 group-hover:text-accent motion-reduce:transition-none"
              >
                →
              </span>
            </div>
            <div className="border-t border-line px-5 py-4 sm:px-7">
              <span className="inline-flex min-h-11 items-center bg-accent px-5 text-sm font-medium text-accent-contrast">
                Try experiment #001
              </span>
            </div>
          </Link>

          <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {traits.map((t) => (
              <li key={t} className="flex items-baseline gap-2 text-sm text-muted">
                <span aria-hidden className="font-mono text-xs text-accent">
                  ▪
                </span>
                {t}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
