import type { NextConfig } from "next";

// S-002: security-headers. De niet-brekende set wordt ENFORCED; de CSP staat
// bewust op Report-Only zodat een te strak connect-/script-src een live pagina
// niet breekt. Na een QA-ronde (violation-reports) kan de CSP naar een enforced
// `Content-Security-Policy` met nonce (verwijder dan 'unsafe-inline').
//
// LET OP: deze app gebruikt camera (CameraScan) + microfoon (acoustics) —
// Permissions-Policy staat die daarom expliciet toe voor 'self'.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.pdok.nl https://service.pdok.nl",
  "font-src 'self' data:",
  // Browser-fetches: NL open data (PDOK/3DBAG). Upstash/Anthropic zijn server-side.
  "connect-src 'self' https://api.3dbag.nl https://api.pdok.nl https://service.pdok.nl",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera/microfoon zijn kernfeatures → self toestaan; geolocation dicht.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
