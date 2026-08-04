"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function GateFormInner() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;
      if (res.ok && json?.ok) {
        const from = params.get("from");
        // Only same-origin relative paths, never external redirects.
        const target = from && from.startsWith("/") && !from.startsWith("//")
          ? from
          : "/";
        router.replace(target);
        router.refresh();
      } else {
        setError(json?.error ?? "That password is not correct.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8">
      <label htmlFor="site-password" className="lab-label">
        Password
      </label>
      <input
        id="site-password"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-2 min-h-12 w-full border border-line bg-surface px-4 text-[15px] focus:border-line-strong focus:outline-none"
      />
      {error && (
        <p className="mt-3 text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || password.length === 0}
        className="mt-4 min-h-12 w-full bg-accent px-6 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}

export function GateForm() {
  return (
    <Suspense fallback={null}>
      <GateFormInner />
    </Suspense>
  );
}
