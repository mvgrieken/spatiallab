import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/shared/SiteChrome";

export const metadata: Metadata = {
  title: "Where it fails",
  description:
    "The bugs SpatialLab shipped, the ones it caught before shipping, and the things it still cannot verify. Written down because a demo that only shows its best day is not evidence.",
  alternates: { canonical: "/where-it-fails" },
};

type Failure = {
  title: string;
  experiment: string;
  what: string;
  why: string;
  fix: string;
  lesson: string;
};

const FAILURES: Failure[] = [
  {
    title: "It rendered the wrong building, and said nothing",
    experiment: "#004 Solar Roof",
    what: "Typing a nonsense address returned a real roof, in 3D, with a solar score. Nothing on screen suggested anything was wrong.",
    why: "The Dutch address service does fuzzy matching. Given gibberish it returns its best guess with a low relevance score, and the code was accepting any result at all.",
    fix: "A minimum relevance threshold. Below it, the lookup says 'not found' instead of guessing.",
    lesson:
      "This is the failure this whole project is about. The system was not uncertain and hiding it — it had no idea it was wrong, and neither did the interface. An answer delivered with full confidence about the wrong thing is worse than no answer, and no disclaimer at the bottom of the page fixes that.",
  },
  {
    title: "The analysis that never finished",
    experiment: "#001, #002",
    what: "A scan would sit on 'Analyzing' until the request quietly died. No result, no error, no retry.",
    why: "Four timeouts that nobody had lined up against each other. Reasoning effort defaulted high, pushing an analysis past 90 seconds. The API client then retried, doubling the wall clock, while the server route capped out at 120 seconds and died mid-retry.",
    fix: "Every layer now outlives the one inside it: effort pinned lower, client retries off, route cap raised, browser timeout last. A failure surfaces as a readable error instead of silence.",
    lesson:
      "The failure was not the model being wrong. It was four defensible decisions adding up to a hang — the kind of thing that looks fine in review and only appears when something actually runs slowly.",
  },
  {
    title: "It claimed to use AI where there is none",
    experiment: "#003, #004",
    what: "'Experimental AI output' appeared under experiments that call no model at all. #003 computes geometry from numbers you type; #004 reads public building data.",
    why: "A single site-wide disclaimer, written when every experiment used AI, never revisited when experiments stopped using it.",
    fix: "A per-experiment disclaimer, and the site-wide text narrowed to 'Experimental output'.",
    lesson:
      "A project whose whole pitch is honesty was overstating its own use of AI — in the safety text, of all places. Boilerplate copied across features is exactly where this kind of drift hides.",
  },
];

const UNKNOWNS = [
  {
    title: "Whether any of it is actually useful",
    body: "Every experiment was validated with synthetic inputs: box-shaped rooms as camera frames, a generated impulse instead of a clap, known test addresses. That proves the machinery works. It does not prove an answer is worth reading in a real living room.",
  },
  {
    title: "Whether the AR object is really the right size",
    body: "#003 promises furniture at true size. That claim is unit-tested in the geometry, but placing it in a room happens in Apple's AR viewer on hardware we cannot simulate. Until someone holds a tape measure against it, it is a claim, not a fact.",
  },
  {
    title: "Whether your phone honours the microphone settings",
    body: "#005 asks the browser to switch off automatic gain, echo cancellation and noise suppression, because they destroy the decay it measures. Whether iPhone hardware actually complies is not something a synthetic test can reveal. If it does not, the numbers are wrong.",
  },
];

export default function WhereItFailsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16">
        <p className="lab-label">Honesty</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Where it fails
        </h1>
        <p className="mt-5 text-lg leading-snug text-muted">
          Anyone can build an AI demo that works in the one room it was tested
          in. This page is the other half: what went wrong, what is still
          unverified, and what that says about the technology.
        </p>

        <section className="mt-14">
          <h2 className="lab-label">Bugs found before launch</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            All three were caught by automated validation, not by a user. They
            are listed here rather than quietly fixed because the failure modes
            are more interesting than the fixes.
          </p>

          <div className="mt-8 space-y-12">
            {FAILURES.map((f) => (
              <article key={f.title}>
                <p className="font-mono text-xs text-accent">{f.experiment}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">
                  {f.title}
                </h3>
                <dl className="mt-4 space-y-3 text-[15px] leading-relaxed">
                  <div>
                    <dt className="lab-label">What happened</dt>
                    <dd className="mt-1 text-muted">{f.what}</dd>
                  </div>
                  <div>
                    <dt className="lab-label">Why</dt>
                    <dd className="mt-1 text-muted">{f.why}</dd>
                  </div>
                  <div>
                    <dt className="lab-label">What changed</dt>
                    <dd className="mt-1 text-muted">{f.fix}</dd>
                  </div>
                </dl>
                <p className="mt-4 border-l-2 border-line pl-4 text-[15px] leading-relaxed">
                  {f.lesson}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-line pt-10">
          <h2 className="lab-label">What is still unverified</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Listing what you have not tested is less comfortable than listing
            what you have. It is also the more useful half.
          </p>
          <div className="mt-8 space-y-8">
            {UNKNOWNS.map((u) => (
              <article key={u.title}>
                <h3 className="text-lg font-semibold">{u.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">
                  {u.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-line pt-10">
          <h2 className="lab-label">The standing bet</h2>
          <p className="mt-3 text-[15px] leading-relaxed">
            Research keeps finding that vision-language models still stumble
            over basic spatial relations while the market insists the problem
            is solved. SpatialLab is a set of small, checkable experiments on
            that gap. Every answer is anchored to something you can verify
            yourself, and{" "}
            <Link href="/stats" className="underline hover:text-foreground">
              the track record page
            </Link>{" "}
            publishes how often visitors say it got it right — including when
            that number is unflattering, and including when there is not enough
            data to publish one at all.
          </p>
        </section>

        <p className="mt-12 border-t border-line pt-6 text-sm text-faint">
          Experimental output. Estimates are not measurements or professional
          advice.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
