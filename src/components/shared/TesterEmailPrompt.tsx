"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";

const DISMISS_KEY = "sl-tester-prompt-dismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Optionele, wegklikbare bèta-tester opt-in. Blokkeert het gebruik nooit.
 * Stuurt het adres naar /api/tester-subscribe (server → hub comms, double
 * opt-in). Vereist een expliciet consent-vinkje (AVG-grondslag = toestemming).
 * SpatialLab bewaart het adres niet; het leeft op de hub.
 *
 * `useSyncExternalStore` (i.p.v. useEffect+setState): op de server → dismissed
 * (rendert niets, geen hydratie-flits), op de client leest het localStorage.
 */
export function TesterEmailPrompt() {
  const persisted = useSyncExternalStore(
    () => () => {},
    readDismissed,
    () => true,
  );
  const [closedNow, setClosedNow] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  function close() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: dan blijft hij deze render weg via closedNow */
    }
    setClosedNow(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!consent || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/tester-subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consent: true }),
      });
      setState(res.ok ? "done" : "error");
      if (res.ok) {
        try {
          localStorage.setItem(DISMISS_KEY, "1");
        } catch {
          /* ignore */
        }
      }
    } catch {
      setState("error");
    }
  }

  if (persisted || closedNow) return null;

  return (
    <div className="rounded-xl border border-line p-4 text-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">Ben je aan het testen?</p>
          <p className="mt-1 text-muted">
            Laat je e-mail achter voor updates over SpatialLab. We sturen je een bevestigingsmail
            — pas na jouw klik ontvang je iets.
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Sluiten"
          className="shrink-0 rounded p-1 text-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {state === "done" ? (
        <p className="mt-3 font-medium text-foreground">
          Check je inbox om je aanmelding te bevestigen. Bedankt voor het testen!
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
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
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Ik geef toestemming om testupdates per e-mail te ontvangen. Uitschrijven kan altijd.
              Zie het{" "}
              <a href="/privacy" className="underline">
                privacybeleid
              </a>
              .
            </span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!consent || state === "sending"}
              className="rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-40"
            >
              {state === "sending" ? "Versturen…" : "Aanmelden"}
            </button>
            {state === "error" && (
              <span className="text-xs text-muted">Er ging iets mis — probeer het later opnieuw.</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
