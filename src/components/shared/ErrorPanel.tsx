"use client";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export type ErrorAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
};

/**
 * The one error surface for every experiment: a friendly title, a plain
 * explanation and a way out — never a dead end, never a stack trace.
 */
export function ErrorPanel({
  title,
  message,
  actions,
}: {
  title: string;
  message: string;
  actions: ErrorAction[];
}) {
  return (
    <Panel>
      <p className="lab-label !text-accent">{title}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{message}</p>
      <div className="mt-6 flex flex-col gap-3">
        {actions.map((a, i) => (
          <Button
            key={a.label}
            variant={a.variant ?? (i === 0 ? "primary" : "secondary")}
            onClick={a.onClick}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </Panel>
  );
}
