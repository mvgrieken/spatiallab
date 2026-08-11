import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/shared/SiteChrome";
import { readVoteStats } from "@/lib/store/counters";
import { MIN_VOTES_TO_PUBLISH } from "@/lib/store/keys";

export const metadata: Metadata = {
  title: "How often it is right",
  description:
    "Visitors report whether SpatialLab's answer matched their room. The self-reported score, published as soon as there is enough of it to mean anything.",
  alternates: { canonical: "/stats" },
};

// A tally that moves by a handful a day does not need per-request freshness.
export const revalidate = 60;

export default async function StatsPage() {
  const { total, percentage, available } = await readVoteStats();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16">
        <p className="lab-label">Track record</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          How often it is right
        </h1>

        <div className="mt-10">
          {percentage !== null ? (
            <>
              <p className="text-6xl font-semibold tracking-tight sm:text-7xl">
                {percentage}%
              </p>
              <p className="mt-3 text-[15px] text-muted">
                of {total} visitors said the AI&rsquo;s read of their room was
                right.
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Not enough answers yet.
              </p>
              <p className="mt-3 text-[15px] text-muted">
                {available
                  ? `${total} ${total === 1 ? "person has" : "people have"} rated an answer so far. We publish a percentage at ${MIN_VOTES_TO_PUBLISH} — below that a number would say more about chance than about the model.`
                  : "The tally is not reachable right now, so no number is shown. Rather that than a figure we cannot stand behind."}
              </p>
            </>
          )}
        </div>

        <div className="mt-12 space-y-8 border-t border-line pt-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">What this number is</h2>
            <p className="mt-2 text-muted">
              Self-reported. After an answer, visitors can tap yes or no — that
              is a person&rsquo;s judgement about their own room, not a
              measurement against ground truth. It is the honest thing we can
              collect without storing anything about you, and it is softer
              evidence than a benchmark. We would rather publish a soft number
              openly than a hard one we made up.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Why publish it at all</h2>
            <p className="mt-2 text-muted">
              Anyone can build an AI demo that looks convincing in the one room
              it was tested in. Almost nobody publishes how often theirs is
              wrong. Research keeps finding that vision-language models still
              stumble over basic spatial relations while the market insists the
              problem is solved. This page is the cheapest way to stay honest
              about which side of that gap SpatialLab is on.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">What is counted</h2>
            <p className="mt-2 text-muted">
              Two numbers: how many people tapped yes and how many tapped no.
              Only the two experiments where a model interprets your room
              (#001 Ask Your Room and #002 Find the Best Spot) carry the
              question. #003 computes geometry from dimensions you type in,
              #004 reads public building data and #005 measures a decay curve —
              those are not the model&rsquo;s judgement, so folding them in
              would flatter this number. A vote carries no image, no question,
              no answer and no profile — see{" "}
              <a href="/privacy" className="underline hover:text-foreground">
                Privacy
              </a>{" "}
              for exactly what is kept.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
