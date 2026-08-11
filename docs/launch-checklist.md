# Launch checklist — SpatialLab

## Phase 1 — Preview (current)

- [x] Lint, typecheck, unit tests, production build all pass
- [x] Mock mode works locally; impossible in production builds
- [x] Server-side Zod validation on requests and model output
- [x] No secrets in client bundle (verified by grep over `.next/static`)
- [x] Privacy page + "Experimental AI output" notice visible
- [x] SEO: title, description, canonical, OG image, robots, sitemap, favicon
- [x] GitHub repository created and pushed
- [x] Vercel project created, env vars configured, preview deployed
- [ ] Preview verified on a physical iPhone (`docs/iphone-testing.md`) — **owner**

## Phase 2 — Production (only after explicit owner approval)

- [ ] Fix any bugs found during iPhone testing
- [ ] Re-run lint / typecheck / tests / build
- [ ] Set production env vars (`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL=https://spatiallab.atthis.ai`)
- [ ] Counter store: create the Upstash Redis database in **Frankfurt**, set
      `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CLIENT_HASH_SALT`
      (`openssl rand -base64 32`) and `DAILY_ANALYSIS_BUDGET`. Without these,
      votes are dropped and the daily cap fails open — the site still runs
- [ ] Per-IP rate-limit rules in the Vercel Firewall on `/api/room/*`,
      `/api/spots/*` and `/api/roof/analyze` (dashboard, owner action)
- [ ] Production deployment
- [ ] Attach domain `spatiallab.atthis.ai` (inspect current status first; no
      forced moves; owner applies DNS record at the DNS provider)
- [ ] Verify HTTPS, canonical URL, redirects, production logs
- [ ] Set Anthropic spend limit + Vercel spend management thresholds
- [ ] Re-check OG cards against the production URL
- [ ] Pin `CODE_REF` in `src/lib/site.ts` to the release commit or tag, so the
      "how it works" code links keep pointing at the code they describe

## Emergency brake

In order of speed. All are reversible.

1. **Kill switch (seconds, no deploy):** set `killswitch_spatiallab` to `true`
   in Vercel Edge Config. The whole site serves a maintenance page until the
   flag is cleared. This is the first thing to reach for.
2. **Throttle instead of going dark:** lower `DAILY_ANALYSIS_BUDGET` in the
   Vercel environment. Visitors get a "today's budget is used up" state and the
   non-AI experiments keep working.
3. **Blunt fallback:** remove `ANTHROPIC_API_KEY` and redeploy (AI routes return
   a friendly 503), or pause the Vercel project. Slower, and leaves the site in
   a half-working state — prefer 1 or 2.
