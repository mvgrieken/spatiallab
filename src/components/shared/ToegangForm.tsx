"use client";

import { useState, type FormEvent } from "react";

/**
 * E-mailformulier voor de toegangspoort. Post naar /api/toegang/request, dat de
 * toegangslink mailt en het adres (best-effort) op de hub registreert. Antwoord
 * is altijd generiek — daarom tonen we bij succes gewoon "check je inbox".
 */
export function ToegangForm() {
  const [email, setEmail] = useState("");
  const [updates, setUpdates] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/toegang/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, updates }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-lg border border-line p-4 text-sm">
        Check je inbox — we hebben je een toegangslink gestuurd. De link is 30 dagen geldig.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="jij@voorbeeld.nl"
        autoComplete="email"
        className="w-full rounded-lg border border-line bg-transparent px-3 py-2 outline-none focus:border-foreground"
      />
      <label className="flex items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={updates}
          onChange={(e) => setUpdates(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Houd me ook per e-mail op de hoogte van updates (optioneel). Zie het{" "}
          <a href="/privacy" className="underline">
            privacybeleid
          </a>
          .
        </span>
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-40"
        >
          {state === "sending" ? "Versturen…" : "Stuur me een toegangslink"}
        </button>
        {state === "error" && (
          <span className="text-xs text-muted">Er ging iets mis — probeer het later opnieuw.</span>
        )}
      </div>
    </form>
  );
}
