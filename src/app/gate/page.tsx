import type { Metadata } from "next";

import { GateForm } from "@/components/spatiallab/GateForm";

export const metadata: Metadata = {
  title: "Private preview",
  robots: { index: false, follow: false },
};

export default function GatePage() {
  return (
    <main className="survey-grid mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
      <p className="lab-label">Private preview</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Spatial<span className="text-accent">Lab</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        This site is not public yet. Enter the access password to continue.
      </p>
      <GateForm />
    </main>
  );
}
