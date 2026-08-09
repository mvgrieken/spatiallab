# AUDIT_PLAN — SpatialLab security-audit (fleet-app #9)

Status: verkenning fase 0-2 + gerichte review afgerond 2026-08-09 · Branch: `security/cso-2026-08-06` (aangemaakt vanaf `main`). Template: `~/dev/_security-audit-kit/`.

- [x] Fase 0 — secret-triage (historie 0, verified 0, 0 getrackte WT-treffers; geen NEXT_PUBLIC-lek) + e-mail-audit (**geen mailcode** → Resend-incidentklasse n.v.t.)
- [x] Fase 1/2 — architectuur + dreigingsmodel (verkenning): Next.js 16.3 (App Router), next-auth 5 beta, **database-loos**, Vercel; AI-vision via Anthropic
- [x] Gerichte review — kosten-caps op AI-routes, auth-gate, headers, CI, EU-residentie → S-001..S-006
- [ ] **Diepere fase 3-6 (optioneel):** runtime-verificatie of de auth-gate in prod aan staat, Vercel Firewall/spend-management, PDOK-outbound-gedrag
- [ ] Fase 7 — fixes per goedgekeurd S-nummer

## Reikwijdte
SpatialLab = publieke verzameling browser-experimenten (kamer-analyse via foto/camera, "does it fit", room-acoustics, solar-roof via NL open data), AI-vision via Claude, **bewust database-loos** (enige store = Upstash). Auth-gate optioneel (email+wachtwoord, één account); bij niet-geconfigureerde env → publiek ("launch mode"). Verkenning + gerichte review, read-only. Enkele breedte-checks niet-geverifieerd (zie FINDINGS). NB: repo stond op `main` zonder security-branch en met lokale WIP — deze audit voegt alleen `docs/security/` + `SECURITY_AUDIT.md` toe (expliciete pathspecs, WIP ongemoeid).

## Bevindingen: `FINDINGS.md` (S-001 fail-open kosten-cap op AI-routes = prioriteit; S-002 geen headers/CSP; S-003 geen CI/secret-scan; S-004 in-memory auth-throttle; S-005 EU-residentie niet gepind; S-006 geen security-branch/scan). Rapport: `SECURITY_AUDIT.md`.
