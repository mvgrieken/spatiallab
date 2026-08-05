import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/shared/SiteChrome";
import { publishedExperiments, upcomingExperiments } from "@/lib/experiments";

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

        {/* Published experiments */}
        <section className="py-12 sm:py-16">
          <div className="flex items-baseline justify-between">
            <h2 className="lab-label">Published experiments</h2>
            <span className="lab-label">
              {String(publishedExperiments.length).padStart(2, "0")} /{" "}
              {String(publishedExperiments.length + upcomingExperiments.length).padStart(2, "0")}
            </span>
          </div>

          {publishedExperiments.map((exp) => (
            <Link
              key={exp.id}
              href={`/experiments/${exp.slug}`}
              className="group mt-4 block border border-line bg-surface transition-colors hover:border-line-strong"
            >
              <div className="flex items-start justify-between gap-4 p-5 sm:p-7">
                <div>
                  <p className="font-mono text-xs text-accent">#{exp.id}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {exp.title}
                  </h3>
                  <p className="mt-2 text-[15px] text-muted">{exp.subtitle}</p>
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
                  Try experiment #{exp.id}
                </span>
              </div>
            </Link>
          ))}

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

          {/* Coming soon — numbers and titles only, no fake features */}
          {upcomingExperiments.length > 0 && (
            <div className="mt-12">
              <h2 className="lab-label">Coming soon</h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {upcomingExperiments.map((exp) => (
                  <li
                    key={exp.id}
                    className="flex items-baseline gap-4 py-3 text-muted"
                  >
                    <span className="font-mono text-xs text-faint">#{exp.id}</span>
                    <span className="text-sm">{exp.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
