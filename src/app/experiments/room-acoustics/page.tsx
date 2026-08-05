import type { Metadata } from "next";

import { RoomAcoustics } from "@/components/experiments/room-acoustics/RoomAcoustics";
import { ExperimentLayout } from "@/components/shared/ExperimentLayout";
import { getExperiment } from "@/lib/experiments";

const experiment = getExperiment("room-acoustics")!;

export const metadata: Metadata = {
  title: `#${experiment.id} — ${experiment.title}`,
  description: `${experiment.subtitle} ${experiment.description}`,
  alternates: { canonical: "/experiments/room-acoustics" },
};

export default function RoomAcousticsPage() {
  return (
    <ExperimentLayout experiment={experiment}>
      <RoomAcoustics />
    </ExperimentLayout>
  );
}
