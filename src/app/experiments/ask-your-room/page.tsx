import type { Metadata } from "next";

import { AskYourRoom } from "@/components/experiments/ask-your-room/AskYourRoom";
import { ExperimentLayout } from "@/components/shared/ExperimentLayout";
import { getExperiment } from "@/lib/experiments";

const experiment = getExperiment("ask-your-room")!;

export const metadata: Metadata = {
  title: `#${experiment.id} — ${experiment.title}`,
  description: `${experiment.subtitle} ${experiment.description}`,
  alternates: { canonical: "/experiments/ask-your-room" },
};

export default function AskYourRoomPage() {
  return (
    <ExperimentLayout experiment={experiment}>
      <AskYourRoom />
    </ExperimentLayout>
  );
}
