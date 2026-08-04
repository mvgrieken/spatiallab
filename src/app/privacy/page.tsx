import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/spatiallab/SiteChrome";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How SpatialLab handles camera images, questions and answers. No image database, no accounts, no tracking of personal content.",
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
              Experiment #001 uses your camera (or photos you upload). During a
              scan your browser selects roughly six still frames, downscales
              and compresses them on your device, and sends only those selected
              frames for analysis. The full video stream is never recorded,
              stored or uploaded.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">What SpatialLab stores</h2>
            <p className="mt-2 text-muted">
              Nothing. SpatialLab does not maintain a database. In this version
              we do not store video, images, frames, questions, answers, user
              profiles, scan sessions, or IP addresses in any database of our
              own. When you close or refresh the page, your scan is gone.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">The AI provider</h2>
            <p className="mt-2 text-muted">
              Selected frames and your questions are sent securely to our AI
              provider (Anthropic) to generate the analysis. The provider
              processes them under its own data policies; SpatialLab cannot
              guarantee that the provider never retains data, so treat what
              you film accordingly. Please do not film sensitive or
              confidential situations, documents, or people who have not
              agreed to it.
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
            <h2 className="text-lg font-semibold">What the output is — and is not</h2>
            <p className="mt-2 text-muted">
              Answers are experimental and indicative. They are rough visual
              estimates, not measurements, and never structural, electrical,
              fire-safety, health or professional advice. For anything that
              matters, consult a qualified professional.
            </p>
          </section>

          <p className="border-t border-line pt-6 text-sm text-faint">
            Experimental AI output. Estimates are not measurements or
            professional advice.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
