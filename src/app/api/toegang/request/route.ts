import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { signAccessToken } from "@/lib/access-link";
import { sendAccessLinkEmail } from "@/lib/access-mail";
import { getSiteUrl } from "@/lib/site";
import {
  addressHash,
  allowMailAction,
  clientHash,
  requestIp,
} from "@/lib/store/counters";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(254),
  updates: z.boolean().optional(),
});

/**
 * E-mail-toegangspoort: de bezoeker laat zijn adres achter en krijgt één mail met
 * een toegangslink. Het adres wordt óók (best-effort) in het comms-platform op de
 * hub geregistreerd — zodat je in atthis.ai/admin ziet wie er binnenkomt — zonder
 * een aparte bevestigingsmail (die record-only-registratie doet de hub). SpatialLab
 * bewaart het adres zelf niet.
 *
 * Antwoord is altijd generiek {ok:true} (geen e-mail-enumeratie).
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
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  // Abuse-rem vóór het versturen: per IP (8/uur) én per doeladres (3/24u), zodat
  // dit endpoint geen open e-mail-cannon is — mailbombarderen van een willekeurig
  // adres (ook vanaf verspreide IP's) en Resend-kosten/reputatie-misbruik vanaf
  // de gedeelde afzender. Over de limiet → stil generiek {ok:true}, geen mail.
  const ipHash = clientHash(requestIp(req.headers));
  const addrHash = addressHash(email);
  const [ipOk, addrOk] = await Promise.all([
    allowMailAction("access-ip", ipHash, 8, 60 * 60),
    allowMailAction("access-addr", addrHash, 3, 24 * 60 * 60),
  ]);

  const token = ipOk && addrOk ? await signAccessToken(email) : null;
  if (token) {
    const link = `${getSiteUrl()}/toegang/verify?token=${encodeURIComponent(token)}`;
    await sendAccessLinkEmail(email, link);

    // Best-effort: leg het adres vast op de hub (record-only, geen extra mail).
    // Faalt stil als de hub-endpoint of de key ontbreekt — de toegang werkt dan nog.
    const key = process.env.COMMS_API_KEY_SPATIALLAB;
    const hub = process.env.COMMS_HUB_URL ?? "https://atthis.ai";
    if (key) {
      try {
        await fetch(`${hub}/api/comms/v1/record`, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({
            email,
            source: "spatiallab-beta-access",
            marketing: parsed.data.updates === true,
          }),
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        /* hub traag/onbereikbaar: toegang werkt nog, record volgt bij retry */
      }
    }
  }
  return NextResponse.json({ ok: true });
}
