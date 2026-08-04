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
- [ ] Production deployment
- [ ] Attach domain `spatiallab.atthis.ai` (inspect current status first; no
      forced moves; owner applies DNS record at the DNS provider)
- [ ] Verify HTTPS, canonical URL, redirects, production logs
- [ ] Set Anthropic spend limit + Vercel spend management thresholds
- [ ] Re-check OG cards against the production URL

## Emergency brake

High unexpected usage/cost: remove `ANTHROPIC_API_KEY` from the Vercel env and
redeploy (API returns a friendly 503), or pause the Vercel project. Both are
reversible.
