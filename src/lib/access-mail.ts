import "server-only";
import { HUISSTIJL, alinea, klein, knopMetTerugval, renderMail } from "./mail-huisstijl";

const ONDERWERP = "Je toegangslink voor SpatialLab";

/**
 * De mail in de vlootopmaak (logo, SpatialLab-oranje knop). De link wordt
 * geëscapet en alleen een http(s)-link wordt een knop; voorheen ging hij
 * rauw in een href.
 */
export function toegangsmailHtml(link: string): string {
  return renderMail(HUISSTIJL, {
    onderwerp: ONDERWERP,
    inhoud: [
      alinea(HUISSTIJL, "Welkom bij de SpatialLab-bèta."),
      knopMetTerugval(HUISSTIJL, link, "Open SpatialLab"),
      klein(HUISSTIJL, "De link is 30 dagen geldig. Heb je dit niet aangevraagd? Negeer deze mail."),
    ].join("\n"),
  });
}

export function toegangsmailTekst(link: string): string {
  return ["Welkom bij de SpatialLab-bèta.", link, "De link is 30 dagen geldig. Heb je dit niet aangevraagd? Negeer deze mail."].join("\n\n");
}

/**
 * Verstuurt de bèta-toegangslink per e-mail (Resend). SpatialLab had bewust geen
 * mailcapaciteit; voor de e-mail-toegangspoort (eigenaarsbesluit) hergebruiken we
 * de atthis-geverifieerde afzender. Dit is de enige plek waar SpatialLab mailt.
 * Faalt stil (retourneert false) zodat de gebruiker nooit een fout ziet en er
 * geen adres blijft hangen.
 */
export async function sendAccessLinkEmail(email: string, link: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "SpatialLab <nieuws@atthis.ai>";
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: ONDERWERP,
        html: toegangsmailHtml(link),
        text: toegangsmailTekst(link),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
