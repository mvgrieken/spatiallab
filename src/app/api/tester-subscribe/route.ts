import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  addressHash,
  allowMailAction,
  clientHash,
  requestIp,
} from "@/lib/store/counters";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(254),
  consent: z.literal(true),
});

/**
 * Bèta-tester opt-in. Stuurt het adres server-side door naar het comms-platform
 * op de hub (`/api/comms/v1/subscribe`), dat de double-opt-in-bevestigingsmail
 * verstuurt en de consent vastlegt. SpatialLab zelf slaat het adres NIET op —
 * dat blijft op de hub (EU), zodat SpatialLab persoonsdata-vrij blijft.
 *
 * Antwoord is altijd generiek `{ok:true}` (geen e-mail-enumeratie); de
 * bevestigingsmail doet de rest.
 */
export async function POST(req: NextRequest): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  // Zelfde abuse-rem als de toegangspoort: dit triggert de dubbele-opt-in-mail
  // van de hub, dus per IP (8/uur) én per doeladres (3/24u) begrenzen om
  // mailbombarderen / Resend-misbruik te voorkomen. Over de limiet → stil ok.
  const [ipOk, addrOk] = await Promise.all([
    allowMailAction("tester-ip", clientHash(requestIp(req.headers)), 8, 60 * 60),
    allowMailAction("tester-addr", addressHash(email), 3, 24 * 60 * 60),
  ]);
  if (!ipOk || !addrOk) {
    return NextResponse.json({ ok: true });
  }

  const key = process.env.COMMS_API_KEY_SPATIALLAB;
  const hub = process.env.COMMS_HUB_URL ?? "https://atthis.ai";
  // Zonder key/hub is opt-in niet geconfigureerd (lokale dev): stil generiek ok,
  // geen valse belofte, geen fout naar de gebruiker.
  if (key) {
    try {
      await fetch(`${hub}/api/comms/v1/subscribe`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          topics: ["updates"],
          source: "spatiallab-beta",
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // Hub traag/onbereikbaar: de gebruiker hoeft dat niet te merken; een
      // retry lost het later op. Nooit het adres hier bufferen (persoonsdata).
    }
  }
  return NextResponse.json({ ok: true });
}
