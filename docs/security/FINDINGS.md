# FINDINGS — SpatialLab security-audit (fleet-app #9)

Append-only. ID = S-xxx. Severity: Critical/High/Medium/Low. Status: OPEN/GOEDGEKEURD/GEFIXT/CHECKLIST. Secretwaarden nooit gereproduceerd. Template: Cortex37-pilot.

Reikwijdte: verkenning (fase 0-2) + gerichte review; enkele breedte-checks niet-geverifieerd (zie onder). SpatialLab = database-loze publieke AI-experiment-collectie, Next.js 16.3 + next-auth 5 beta, Vercel, AI-vision via Anthropic.

---

## Fase 0/1/2 — vaststellingen (2026-08-09)
- **S-M01 Secrets schoon:** gitleaks over álle refs = **0**; trufflehog verified = **0**; 0 getrackte WT-treffers. Enige `NEXT_PUBLIC_*` = `NEXT_PUBLIC_SITE_URL` (bedoeld publiek); geen secret-lek. `.env.local` gitignored.
- **E-mail = n.v.t.:** geen Resend/SMTP/nodemailer (0 hits, geen mail-dependency). `AUTH_ALLOWED_EMAIL` is puur een login-identifier. De Resend-incidentklasse is hier niet van toepassing.
- **Auth:** eigen Credentials-provider (geen Supabase), één toegestaan account uit env. Fail-closed met `AUTH_REQUIRED=true` (503 bij incomplete config, 401 zonder sessie); killswitch draait vóór auth. Generieke foutmelding (geen enumeratie), bcrypt draait altijd (timing), in-process throttle 5/10min → 15min lock.
- **Geen IDOR:** enige dynamische routes = `how/[slug]` (statische content) + `api/auth/[...nextauth]`; geen `[id]`-resource-routes.

## S-001 — Fail-open kosten-cap op betaalde AI-routes (in launch-mode anoniem → kostenmisbruik/DoS)
- **Severity:** Medium · **Status:** OPEN — de counter-store (`src/lib/store/counters.ts`/`redis.ts`/`keys.ts`) staat nog als **niet-gecommitte WIP** in deze repo; de fix (budget-guard fail-CLOSED bij store-outage) hoort in dat werk thuis, niet in deze audit-PR. **Klaargelegde patch (toe te passen in de counter-store-WIP):** `consumeAnalysisBudget` een `unavailable`-state laten teruggeven wanneer de store geconfigureerd maar onbereikbaar is (helper `storeConfigured()` in `redis.ts`), en `budgetGuard` (`lib/api.ts`) dan **503** laten antwoorden i.p.v. de LLM-call door te laten. Alleen de 3 betaalde AI-routes (room/analyze, spots/analyze, room/ask) gebruiken de guard; `roof/analyze` = PDOK open-data (geen LLM). Optioneel vervolg: per-IP rate-limit + captcha + auth-gate verplicht in prod. (De S-001-code-edits zijn 2026-08-09 uit deze audit-PR gehaald omdat ze de untracked counter-store-WIP meecommitten; ze blijven als uncommitte wijziging in de working tree staan.)
- **Bewijs:** `/api/room/analyze`, `/api/room/ask`, `/api/spots/analyze`, `/api/roof/analyze`, `/api/feedback` zijn muterende AI-routes. De enige rem is de daily-budget-guard, die **fail-open** is bij store-uitval (`src/lib/api.ts:53-72`, `src/lib/store/counters.ts:110-121`). Er is **geen server-side per-user rate-limit/captcha** (expliciet erkend, `README.md:214-216`). In "launch mode" (auth-gate uit) zijn deze routes **anoniem** bereikbaar → Anthropic-kostenmisbruik / budget-DoS. Mitigaties (Vercel Firewall-rule, provider-spendlimiet) zijn extern en niet in de repo verifieerbaar.
- **Remediatie:** fail-closed maken bij store-uitval (of een harde in-process fallback-cap), server-side rate-limit per IP/client-hash op de AI-routes, en/of de auth-gate in prod verplicht aanzetten. Overweeg captcha op de anonieme routes.
- **Uitvoerbaarheid:** PR. · **Regressierisico:** laag-middel (budget-gedrag testen).

## S-002 — Geen security-headers/CSP (`next.config.ts` leeg)
- **Severity:** Medium (low-effort fix) · **Status:** GEFIXT (2026-08-09) — `next.config.ts` `headers()`: HSTS/X-Frame DENY/nosniff/Referrer-Policy **enforced** + **Permissions-Policy** die camera/microfoon (kernfeatures) voor 'self' toestaat en geolocation dicht + CSP **Report-Only** (connect-src incl. PDOK/3DBAG open data, media-src blob voor opnames). CSP report-only zodat live-features niet breken; nonce-enforce = QA-vervolg.
- **Bewijs:** `next.config.ts` bevat geen `headers()`; geen `vercel.json` met headers. Geen HSTS/X-Frame-Options/nosniff/CSP/Referrer-Policy/Permissions-Policy buiten Vercel-platformdefaults. (Camera/microfoon-features → Permissions-Policy is hier juist relevant.)
- **Remediatie:** kit-header-set via `next.config.ts`; Permissions-Policy bewust zetten voor de camera/mic-features; CSP report-only starten.
- **Uitvoerbaarheid:** PR. · **Regressierisico:** laag-middel.

## S-003 — Geen CI/CD + geen secret-/dependency-scanning
- **Severity:** Low-Medium · **Status:** GEFIXT (2026-08-09) — `security-scan.yml` toegevoegd (gitleaks werkboom+historie met kanarie + `npm audit --omit=dev --audit-level=high` blokkerend, lokaal geverifieerd 0 vulns) + `.gitleaks.toml` (vloot-basis, `useDefault=true`) + dependabot (npm+github-actions, signaleert de next-auth-beta) + semgrep-SAST (blokkerend `--error`, lokaal 0 findings). CodeQL blijft GHAS-afhankelijk.
- **Bewijs:** geen `.github/`-map, geen workflows. Dus geen secret-scan, geen dependency-audit, geen CodeQL/dependabot/CODEOWNERS. `next-auth` draait op een **beta-release** (`5.0.0-beta.32`) zonder automatische CVE-signalering. Positief neveneffect: het vloot-CI-secret-patroon is per definitie afwezig.
- **Remediatie:** kit-`security-scan.yml` (gitleaks + kanarie + dep-audit) + dependabot; overweeg next-auth naar een stabiele release zodra beschikbaar.
- **Uitvoerbaarheid:** PR. · **Regressierisico:** laag.

## S-004 — Brute-force-throttle alleen in-memory (per serverless-instance)
- **Severity:** Low · **Status:** OPEN (erkend)
- **Bewijs:** `src/lib/auth.ts:27-31` — de 5/10min-throttle leeft in een in-memory `Map`, dus verdeeld over serverless-instances zwak (expliciet erkend in comment). `trustHost: true`.
- **Remediatie:** throttle naar de gedeelde Upstash-store (bestaat al) verplaatsen zodat hij instance-overkoepelend werkt.
- **Uitvoerbaarheid:** PR. · **Regressierisico:** laag.

## S-005 — EU-dataresidentie niet hard afgedwongen (functieregio niet gepind)
- **Severity:** Low · **Status:** OPEN
- **Bewijs:** geen `vercel.json`/`regions`-config → functieregio = provider-default (niet gepind op `fra1`). EU-residentie loopt nu alleen via Upstash-Frankfurt + optionele `ANTHROPIC_INFERENCE_GEO`; een config-hint meldt dat Anthropic `eu` kan weigeren (400) → inference draait mogelijk buiten de EU. Raakt het EU-first-uitgangspunt (foto's/camera-frames zijn persoonsdata-gevoelig).
- **Remediatie:** `regions: ["fra1"]` pinnen; EU-inference-pad expliciet maken (Bedrock EU / Vertex europe) of het niet-EU-pad bewust documenteren als afweging. Zie EU-first-principe.
- **Uitvoerbaarheid:** PR + config. · **Regressierisico:** laag (mogelijk latency/beschikbaarheid).

## S-006 — Geen security-branch/scan-artefacten (op `main`)
- **Severity:** Low · **Status:** GEFIXT (2026-08-09) — security-branch `security/cso-2026-08-06` aangemaakt met `docs/security/` + de CI-scan-artefacten uit S-003. Achterstand t.o.v. de vloot ingelopen.
- **Bewijs:** geen `docs/security/`-map (vóór deze audit), geen security-branch, geen CI-secret-scan; achterstand t.o.v. de rest van de vloot. (Deze audit voegt de docs toe op `security/cso-2026-08-06`.)
- **Remediatie:** samen met S-003 de kit-CI + governance uitrollen.
- **Uitvoerbaarheid:** PR. · **Regressierisico:** laag.

## Niet geverifieerd (voor een diepere fase 3-6-pass)
- Runtime: of `AUTH_REQUIRED`/de gate in **productie** aan staat (bepaalt of de AI-routes anoniem open staan) — cruciaal voor de ernst van S-001.
- Vercel Firewall-rules, spend-management, Edge-Config killswitch-flags, functieregio (buiten repo).
- Werkelijke deploy-status (live vs. dormant) + of prod-headers via het dashboard gezet zijn.
- PDOK/3D-BAG outbound (`src/lib/roof/pdok.ts`): hosts hardcoded + `encodeURIComponent` → SSRF-oppervlak laag, timeout/retry niet dynamisch getest.
- Geen DAST (read-only).
