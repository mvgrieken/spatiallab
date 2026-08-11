import "server-only";

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
        subject: "Je toegangslink voor SpatialLab",
        html: [
          "<p>Welkom bij de SpatialLab-bèta.</p>",
          `<p><a href="${link}">Open SpatialLab</a></p>`,
          "<p>De link is 30 dagen geldig. Heb je dit niet aangevraagd? Negeer deze mail.</p>",
        ].join(""),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
