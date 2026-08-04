import type { Metadata } from "next";

import { AskYourRoom } from "@/components/room/AskYourRoom";
import { SiteFooter, SiteHeader } from "@/components/spatiallab/SiteChrome";

export const metadata: Metadata = {
  title: "#001 — Ask Your Room",
  description:
    "Film your room. Ask it a question. A small browser experiment: AI looks at a few frames of your room and answers questions about what it sees.",
  alternates: { canonical: "/experiments/ask-your-room" },
};

export default function AskYourRoomPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:py-14">
        <p className="font-mono text-xs text-accent">Experiment #001</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Ask Your Room
        </h1>
        <p className="mt-2 text-lg text-muted">
          Film your room. Ask it a question.
        </p>
        <div className="mt-8">
          <AskYourRoom />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
