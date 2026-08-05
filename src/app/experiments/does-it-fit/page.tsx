import type { Metadata } from "next";

import { DoesItFit } from "@/components/experiments/does-it-fit/DoesItFit";
import { ExperimentLayout } from "@/components/shared/ExperimentLayout";
import { getExperiment } from "@/lib/experiments";

const experiment = getExperiment("does-it-fit")!;

export const metadata: Metadata = {
  title: `#${experiment.id} — ${experiment.title}`,
  description: `${experiment.subtitle} ${experiment.description}`,
  alternates: { canonical: "/experiments/does-it-fit" },
};

export default function DoesItFitPage() {
  return (
    <ExperimentLayout experiment={experiment}>
      <DoesItFit />
    </ExperimentLayout>
  );
}
