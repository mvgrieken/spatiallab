# SECURITY_AUDIT — SpatialLab (fleet-app #9)

Datum: 2026-08-09 · Branch: `security/cso-2026-08-06` (vanaf `main`) · Reikwijdte: verkenning fase 0-2 + gerichte review (enkele breedte-checks niet-geverifieerd, zie FINDINGS). Detail: `docs/security/FINDINGS.md`. Template: Cortex37-pilot.

## Managementsamenvatting
SpatialLab is een **database-loze** publieke verzameling browser-experimenten (kamer-analyse via foto/camera, "does it fit", room-acoustics, solar-roof via NL open data) met AI-vision via Claude. Next.js 16.3 + next-auth 5 (beta), op Vercel; de enige store is Upstash (Frankfurt). De auth-gate (email+wachtwoord, één account) is optioneel: volledig geconfigureerd → afgeschermd; anders publiek ("launch mode").

De basis is netjes (fail-closed auth met generieke foutmelding + bcrypt-timing + throttle, killswitch vóór auth, geen IDOR, uitgebreide inline security-rationale), en **e-mail is niet van toepassing** — er is geen mailcode, dus de Resend-incidentklasse speelt hier niet. Secrets schoon (historie 0, verified 0, geen NEXT_PUBLIC-lek).

**Geen Critical, geen High.** De belangrijkste post is **S-001**: de betaalde AI-routes hebben geen server-side rate-limit/captcha en de enige rem — de daily-budget-guard — is **fail-open** bij store-uitval; in launch-mode (gate uit) zijn die Claude-vision-routes anoniem bereikbaar → kostenmisbruik/budget-DoS. Verder de bekende vloot-gaten: geen security-headers/CSP (S-002), geen CI/secret-scan (S-003), in-memory auth-throttle (S-004), EU-residentie niet hard gepind (S-005, raakt het EU-first-principe want camera-frames zijn gevoelig), en geen bestaande security-branch/scan (S-006).

**6 bevindingen: 0 Critical, 0 High, 2 Medium, 4 Low.**

## Bevindingen
- **S-001** (Medium) — fail-open kosten-cap op anonieme AI-routes (launch-mode) → kostenmisbruik/DoS. → fail-closed + rate-limit + gate verplicht.
- **S-002** (Medium, low-effort) — geen security-headers/CSP. → kit-header-set (+ Permissions-Policy voor camera/mic).
- **S-003** (Low-Med) — geen CI/secret-scan; next-auth op beta. → kit-CI + dependabot.
- **S-004** (Low) — in-memory brute-force-throttle. → naar Upstash verplaatsen.
- **S-005** (Low) — EU-residentie niet gepind (geen `regions`; inference mogelijk buiten EU). → `fra1` pinnen + EU-inference-pad.
- **S-006** (Low) — geen security-branch/scan-artefacten. → samen met S-003.

## Sterke punten (geen actie)
Fail-closed auth (generieke foutmelding, bcrypt-timing, throttle); killswitch vóór auth; geen IDOR; geen e-mail-oppervlak; database-loos (kleine data-footprint); Upstash EU (Frankfurt); geen secrets in git, geen NEXT_PUBLIC-lek; uitgebreide inline security-rationale.

## Aannames / niet geverifieerd
Of de auth-gate in prod aan staat (bepaalt S-001-ernst); Vercel Firewall/spend-management/regio; live deploy-status; PDOK-outbound-gedrag. Zie FINDINGS.

---
**HARDE STOP.** Fixes pas na goedkeuring per S-nummer. Advies: S-001 eerst (bevestig runtime of de gate aan staat; zo niet → fail-closed + rate-limit met prioriteit), S-002/S-003/S-006 als één kit-batch (headers + CI + governance), S-004/S-005 kleine verbeteringen.
