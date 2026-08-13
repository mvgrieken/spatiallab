import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/shared/SiteChrome";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How SpatialLab handles camera images, questions and answers. No content stored, no accounts — only anonymous counters, and exactly where AI processing happens.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16">
        <p className="lab-label">Privacy</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          What happens to your images
        </h1>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">What you provide</h2>
            <p className="mt-2 text-muted">
              The camera experiments (#001 Ask Your Room, #002 Find the Best
              Spot) use your camera or photos you upload. During a scan your
              browser selects roughly six still frames, downscales and
              compresses them on your device, and sends only those selected
              frames for analysis. The full video stream is never recorded,
              stored or uploaded. Experiment #003 (Does It Fit?) runs entirely
              on your device: the dimensions you enter and the 3D model never
              leave your browser, and the AR view runs in Apple&rsquo;s own
              Quick Look viewer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">What SpatialLab stores</h2>
            <p className="mt-2 text-muted">
              No content of yours. We do not store video, images, frames,
              questions, answers, addresses, audio, user profiles or scan
              sessions. When you close or refresh the page, your scan is gone.
            </p>
            <p className="mt-3 text-muted">
              We do keep four kinds of counters, none of which can be traced to
              a person or to anything you filmed:
            </p>
            <ul className="mt-3 space-y-2 text-muted">
              <li>
                — Two whole numbers for the entire site: how many visitors
                tapped &ldquo;yes&rdquo; and how many tapped &ldquo;no&rdquo;
                on the question below an answer. A tap records nothing else —
                not which answer, not which experiment, not when. That is the
                number on the{" "}
                <a href="/stats" className="underline hover:text-foreground">
                  track record
                </a>{" "}
                page.
              </li>
              <li>
                — One counter per type of failure (for example &ldquo;the AI
                service was unreachable&rdquo;), so we can tell a broken
                endpoint from a quiet day.
              </li>
              <li>— A daily count of analyses, to stay inside a fixed budget.</li>
              <li>
                — Short-lived technical keys that stop one visitor from voting
                twice or hammering the endpoint. These are derived from your IP
                address through a one-way hash with a secret salt, cannot be
                turned back into an address, are never stored next to a vote,
                and expire within 24 hours.
              </li>
            </ul>
            <p className="mt-3 text-muted">
              These counters live in a database hosted in Frankfurt, in the EU.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">The AI provider</h2>
            <p className="mt-2 text-muted">
              This applies to the camera experiments only. Selected frames and
              your questions are sent securely to our AI provider (Anthropic)
              to generate the analysis. The provider processes them under its
              own data policies; SpatialLab cannot guarantee that the provider
              never retains data, so treat what you film accordingly. Please do
              not film sensitive or confidential situations, documents, or
              people who have not agreed to it.
            </p>
            <p className="mt-3 text-muted">
              <strong className="font-medium text-foreground">
                That processing happens in the United States.
              </strong>{" "}
              We would rather it happened in the EU, and the code is ready for
              it, but the provider&rsquo;s API currently offers no EU option —
              it accepts only &ldquo;global&rdquo; and &ldquo;us&rdquo;. Routing
              through a cloud provider&rsquo;s European region is on the roadmap;
              until then, this is where your frames go, and we would rather say
              so plainly than leave it out. Nothing is stored there by us, and
              the counters described above never leave the EU.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Addresses (#004 Solar Roof)</h2>
            <p className="mt-2 text-muted">
              An address you enter is forwarded to the Dutch public data
              services (PDOK Locatieserver, BAG) and the 3D BAG dataset to look
              up the building. SpatialLab does not store or log the address, and
              no AI is involved in this experiment. The address travels in the
              body of the request rather than in the web address, so it does not
              end up in the hosting platform&rsquo;s request logs either.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Analytics</h2>
            <p className="mt-2 text-muted">
              We use privacy-friendly, cookieless page analytics (Vercel Web
              Analytics) and count a handful of anonymous events, such as
              &ldquo;scan completed&rdquo;. Analytics events never include
              images, question text, AI answers or personal content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Your email address</h2>
            <p className="mt-2 text-muted">
              During the public beta SpatialLab handles your email address in two
              optional places, and only when you provide it. First, the beta is
              behind a soft access gate: you leave your address and we send you a
              one-time link that sets an access cookie so you can use the site —
              this is a lightweight gate, not an account, and no password is
              involved. Second, you can separately opt in to product updates with
              an explicit consent checkbox, in which case we send a confirmation
              email and you receive nothing further until you click it (double
              opt-in). If you tick the updates box on the access form, that same
              consent applies. In both cases the address is stored by AtThis on
              EU infrastructure (the shared consent platform), kept separate from
              the anonymous analytics above, and never linked to your scans,
              questions or answers. You can unsubscribe or ask us to delete your
              address at any time by replying to any email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">What the output is — and is not</h2>
            <p className="mt-2 text-muted">
              Answers are experimental and indicative. They are rough visual
              estimates, not measurements, and never structural, electrical,
              fire-safety, health or professional advice. For anything that
              matters, consult a qualified professional.
            </p>
          </section>

          <p className="border-t border-line pt-6 text-sm text-faint">
            Experimental output. Estimates are not measurements or
            professional advice.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
