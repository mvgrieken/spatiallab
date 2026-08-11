import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/shared/SiteChrome";
import { getExperiment, publishedExperiments } from "@/lib/experiments";
import { HOW_IT_WORKS, howItWorksFor } from "@/lib/how-it-works";
import { codeLink } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return HOW_IT_WORKS.filter((h) =>
    publishedExperiments.some((e) => e.slug === h.slug),
  ).map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const experiment = getExperiment(slug);
  const how = howItWorksFor(slug);
  if (!experiment || !how) return {};
  return {
    title: `How #${experiment.id} ${experiment.title} works`,
    description: how.premise,
    alternates: { canonical: `/how/${slug}` },
  };
}

export default async function HowItWorksPage({ params }: Params) {
  const { slug } = await params;
  const experiment = getExperiment(slug);
  const how = howItWorksFor(slug);
  if (!experiment || !how || !experiment.published) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16">
        <p className="lab-label">
          Experiment #{experiment.id} · how it works
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {experiment.title}
        </h1>
        <p className="mt-4 text-lg leading-snug text-muted">{how.premise}</p>

        <p className="mt-6">
          <Link
            href={`/experiments/${experiment.slug}`}
            className="lab-label transition-colors hover:text-foreground"
          >
            ← Try it
          </Link>
        </p>

        <section className="mt-12">
          <h2 className="lab-label">The pipeline</h2>
          <ol className="mt-4 space-y-8">
            {how.steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-1 shrink-0 font-mono text-sm text-accent"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 border-t border-line pt-8">
          <h2 className="lab-label">What it cannot do</h2>
          <p className="mt-3 text-[15px] leading-relaxed">
            {how.usesAi
              ? "This experiment sends images to a model. That is worth being precise about, because a confident answer and a correct answer are not the same thing."
              : "This experiment uses no AI at all. Its limits come from the data and the physics, not from a model's judgement."}
          </p>
          <ul className="mt-4 space-y-3">
            {how.limits.map((limit) => (
              <li key={limit} className="text-[15px] leading-relaxed text-muted">
                — {limit}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-line pt-8">
          <h2 className="lab-label">Read the code</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            The parts that do the work, in the order described above.
          </p>
          <ul className="mt-4 space-y-2">
            {how.code.map((entry) => (
              <li key={entry.path}>
                <a
                  href={codeLink(entry.path)}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-[15px] underline transition-colors hover:text-foreground"
                >
                  {entry.label}
                </a>
                <span className="ml-2 font-mono text-xs text-faint">
                  {entry.path}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-line pt-8">
          <p className="text-[15px] leading-relaxed text-muted">
            Every experiment has a page like this.{" "}
            <Link href="/stats" className="underline hover:text-foreground">
              The track record page
            </Link>{" "}
            shows how often visitors say the AI experiments got it right.
          </p>
        </section>

        <p className="mt-10 border-t border-line pt-6 text-sm text-faint">
          {experiment.disclaimer ??
            "Experimental AI output. Estimates are not measurements or professional advice."}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
