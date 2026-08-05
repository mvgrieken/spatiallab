import type { Metadata } from "next";

import { SolarRoof } from "@/components/experiments/solar-roof/SolarRoof";
import { ExperimentLayout } from "@/components/shared/ExperimentLayout";
import { getExperiment } from "@/lib/experiments";

const experiment = getExperiment("solar-roof")!;

export const metadata: Metadata = {
  title: `#${experiment.id} — ${experiment.title}`,
  description: `${experiment.subtitle} ${experiment.description}`,
  alternates: { canonical: "/experiments/solar-roof" },
};

export default function SolarRoofPage() {
  return (
    <ExperimentLayout experiment={experiment}>
      <SolarRoof />
    </ExperimentLayout>
  );
}
