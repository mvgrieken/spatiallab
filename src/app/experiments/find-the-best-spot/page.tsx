import type { Metadata } from "next";

import { FindBestSpot } from "@/components/experiments/find-the-best-spot/FindBestSpot";
import { ExperimentLayout } from "@/components/shared/ExperimentLayout";
import { getExperiment } from "@/lib/experiments";

const experiment = getExperiment("find-the-best-spot")!;

export const metadata: Metadata = {
  title: `#${experiment.id} — ${experiment.title}`,
  description: `${experiment.subtitle} ${experiment.description}`,
  alternates: { canonical: "/experiments/find-the-best-spot" },
};

export default function FindBestSpotPage() {
  return (
    <ExperimentLayout experiment={experiment}>
      <FindBestSpot />
    </ExperimentLayout>
  );
}
