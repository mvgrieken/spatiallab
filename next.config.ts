import type { NextConfig } from "next";

// S-002: security-headers, nu volledig ENFORCED.
//
// De CSP stond op Report-Only "tot een QA-ronde met violation-reports". Die
// ronde kon nooit komen: er staat geen `report-uri` en geen `report-to` in de
// policy, dus die reports gingen nergens heen. Een Report-Only zonder
// rapportage-endpoint is geen tussenstap maar een permanente parkeerplaats — en
// intussen blokkeert hij niets.
//
// De QA is daarom statisch gedaan (2026-08-14):
//
// - `next/font/google` host de fontbestanden bij de build zelf mee vanuit
//   /_next/static, dus `font-src 'self' data:` volstaat.
// - PDOK en 3DBAG zijn de enige externe browser-fetches en staan al in
//   connect-src/img-src. Upstash en Anthropic draaien server-side.
// - `URL.createObjectURL` (DoesItFit, share/card) levert blob:-URL's; blob:
//   staat al in img-src en media-src.
// - Vercel Analytics is de uitzondering die aandacht vroeg — zie hieronder.
//
// LET OP: deze app gebruikt camera (CameraScan) + microfoon (acoustics) —
// Permissions-Policy staat die daarom expliciet toe voor 'self'.
//
// `upgrade-insecure-requests` is eruit bij het enforcen. Op Vercel is elk
// antwoord al https met HSTS-preload, dus in productie voegt de directive niets
// toe; het enige waar hij gedrag verandert is lokaal draaien over http.
// Vercel's eigen preview-toolbar (feedback/comments) laadt van vercel.live en
// praat over een pusher-websocket. Een enforced CSP blokkeert dat, en dan is op
// élke toekomstige PR de Preview Comments-knop stuk — een check die op deze
// repo gewoon meedraait. Geverifieerd op de preview van deze branch: precies
// dat ene script werd geweigerd.
//
// Alleen buiten productie toestaan. VERCEL_ENV is 'production' op de
// productiedeploy en 'preview'/'development' daarbuiten, dus de policy die je
// bezoekers zien wordt hier geen haar breder van.
const previewToolbar = process.env.VERCEL_ENV !== 'production';
const vercelLiveScript = previewToolbar ? ' https://vercel.live' : '';
const vercelLiveConnect = previewToolbar ? ' https://vercel.live wss://ws-us3.pusher.com' : '';

const CSP = [
  "default-src 'self'",
  // va.vercel-scripts.com hoort bij @vercel/analytics. In productie serveert
  // Vercel dat script vanaf /_vercel/insights (same-origin, dus 'self' dekt het),
  // maar buiten productie laadt het pakket zijn debug-variant wél van die host.
  // Zonder deze regel breekt het dus niet op de site maar in dev — de plek waar
  // je het als CSP-fout aanziet en gaat zoeken in de verkeerde app.
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${vercelLiveScript}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.pdok.nl https://service.pdok.nl",
  "font-src 'self' data:",
  // Browser-fetches: NL open data (PDOK/3DBAG). Upstash/Anthropic zijn server-side.
  // Vercel Analytics post naar /_vercel/insights/event — same-origin, dus
  // gedekt door 'self'. De open-data-hosts zijn de enige echte uitzonderingen.
  `connect-src 'self' https://api.3dbag.nl https://api.pdok.nl https://service.pdok.nl${vercelLiveConnect}`,
  "media-src 'self' blob:",
  `frame-src 'self'${vercelLiveScript}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera/microfoon zijn kernfeatures → self toestaan; geolocation dicht.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
