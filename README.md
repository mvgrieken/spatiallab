# SpatialLab by AtThis

**Small experiments exploring how AI understands the physical world.**

SpatialLab is a public hobby project and technical portfolio: a series of
small, working browser experiments about what AI can infer from the physical
world — from a camera image, a sound or an address. No app. No account.
Open and try.

Production URL (planned): `https://spatiallab.atthis.ai`

## Experiment #001 — Ask Your Room

> Film your room. Ask it a question.

Open the site on an iPhone in Safari, make a slow ~10 second camera sweep of a
room, and ask up to three questions about what is visible ("Where could I
place a desk?", "What stands out?"). The AI answers with observations that are
visually anchored to the actual frames — a marker on the image, the visible
evidence, and an honest confidence label.

**What it does**

- Captures ~6 representative frames client-side (no video upload, ever)
- Downscales and JPEG-compresses frames on-device (~1280 px long edge)
- Sends only the selected frames to a vision-capable Claude model
- Validates all model output server-side with Zod (with one controlled repair)
- Anchors every observation/answer to a frame, with marker + confidence
- Falls back to a 3–6 photo upload when the camera is unavailable or denied

**What it does not do**

- No LiDAR, WebXR or RoomPlan; no exact measurements — estimates only
- No structural, electrical, fire-safety, health or professional advice
- No accounts, no database, no storage of images, questions or answers
- No video recording (`MediaRecorder` is not used at all)

## Local development

```bash
npm install
cp .env.example .env.local   # add your own ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000. Camera capture requires HTTPS on real devices;
`localhost` is exempt in most browsers. To test on an iPhone against your dev
machine, use a tunneled HTTPS URL (e.g. `vercel dev`/preview deployments) —
plain `http://<lan-ip>:3000` will not get camera access in Safari.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Server-side only. Never exposed to the client, never logged. |
| `ANTHROPIC_MODEL` | Vision-capable Claude model. Default: `claude-opus-5` (defined once, in `src/lib/config.ts`). |
| `ANTHROPIC_INFERENCE_GEO` | Optional data-residency hint passed to the Anthropic API (e.g. `eu`). Empty = provider default. |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for metadata/sitemap. |
| `NEXTAUTH_SECRET` | JWT signing secret for the login session (NextAuth v5). |
| `AUTH_ALLOWED_EMAIL` | The single email address allowed to sign in. |
| `AUTH_PASSWORD_HASH` | Base64-encoded bcrypt hash of that account's password (see `.env.example`). |
| `EDGE_CONFIG` | Optional Edge Config connection for the fleet killswitch (fails open when unset). |

### Access gate

While the site is private it is protected by an email + password login
(NextAuth v5, Credentials provider, JWT sessions — the same pattern as the
other atthis apps, minus the database: the single account is defined by the
`AUTH_*` env vars). When any of `NEXTAUTH_SECRET` / `AUTH_ALLOWED_EMAIL` /
`AUTH_PASSWORD_HASH` is missing the gate is off and the site is public — to
launch publicly, remove those three **and `AUTH_REQUIRED`** from the Vercel
environment and redeploy. With `AUTH_REQUIRED=true` (the fleet convention,
set in production and preview) an incomplete auth configuration fails closed
(503) instead of silently opening the site.
The proxy also checks the fleet killswitch (Vercel Edge Config flags
`killswitch` / `killswitch_spatiallab`) before anything else.

### Mock mode

Without an `ANTHROPIC_API_KEY`, **development** builds serve realistic mock
data (analysis, answer, marker) so the whole UI can be exercised offline. Mock
responses are visibly labeled in the UI. Mock mode is impossible in production
builds: a missing key there returns a clear configuration notice (HTTP 503),
never mock data. Force mock locally with `SPATIALLAB_FORCE_MOCK=true`.

### Commands

```bash
npm run dev        # dev server
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # vitest (schemas, coordinates, frame utilities)
npm run build      # production build
```

## Architecture

Single Next.js (App Router) app, deliberately without a database, auth, CMS or
plugin architecture. Clear separation of concerns:

```
src/
  app/
    page.tsx                       # homepage (renders the experiment registry)
    privacy/page.tsx               # privacy page
    login/page.tsx                 # access gate (private preview)
    experiments/ask-your-room/     # experiment page (ExperimentLayout shell)
    api/room/{analyze,ask}/        # POST: frames -> typed, validated AI output
    api/auth/[...nextauth]/        # login session handling
  components/
    ui/                            # Button, Panel, TextInput (the whole "kit")
    shared/                        # ExperimentLayout, SiteChrome, AnnotatedFrame,
                                   #   Progress (steps/bar), ErrorPanel
    capture/                       # CameraScan (guided sweep) + PhotoUpload
    experiments/ask-your-room/     # experiment-specific: orchestrator, ResultView
  lib/
    experiments.ts                 # the registry (plain TypeScript, no CMS)
    ai/client.ts                   # the ONE AI runner: frames+prompt -> typed output
    ai/room.ts                     # #001's two tasks, thin configs of the runner
    ai/prompts/ask-your-room.ts    # #001's prompts (one file per experiment)
    ai/mock.ts                     # dev-only mock data
    api-client.ts                  # client-side fetch wrapper + typed calls
    analytics/                     # trackEvent() — vendor isolated in one file
    camera/                        # frame capture, selection, resize, compression
    validation/                    # Zod schemas + controlled repair
    auth*.ts, killswitch*.ts       # access gate + fleet killswitch
  proxy.ts                         # request pipeline: killswitch -> auth gate
  types/room.ts                    # shared domain types
```

Design principles live in [PROJECT.md](./PROJECT.md) — that document outranks
this README.

Flow: the browser captures and compresses frames → `POST /api/room/analyze`
sends them (as raw base64 JPEG) → the server calls Claude with a structured
output schema → the response is Zod-validated (one repair pass: clamping
coordinates/frame indices, truncating arrays) → the UI renders the annotated
frames. Follow-up questions re-send the same frames to `/api/room/ask`.

## Privacy choices

- **No storage**: no video, images, frames, questions, answers, profiles,
  sessions or IP addresses in any SpatialLab database (there is no database).
- **Client-side minimization**: only ~6 downscaled JPEG frames leave the
  device; the raw camera stream never does.
- **Provider processing**: frames are processed by Anthropic under their data
  policies. We do not claim the provider never retains data — see `/privacy`.
- **EU residency**: `ANTHROPIC_INFERENCE_GEO=eu` can pin Anthropic inference
  to a region where supported. This is a per-request hint on the first-party
  API; verify current behavior in Anthropic's docs before relying on it.
- **No sensitive logging**: request bodies, base64 image data and AI input
  are never logged; server logs contain only error classes and sizes.
- **Analytics**: Vercel Web Analytics (cookieless) plus a handful of anonymous
  named events. No images, question text, answers or fingerprints are ever
  sent. No cookie banner is needed because no cookies/identifiers are set.

## Cost & abuse considerations

This version has no accounts and no database, so hard per-user rate limiting
is not possible. What is in place:

- Max 8 frames per request, ~1.6 MB per frame, ~4.2 MB per request (server-enforced)
- Question length capped (400 chars), max 3 questions per browser session
- Server-side Zod validation on every request and on all model output
- Prompt-injection resistance: system-prompt rules explicitly override
  instructions embedded in user questions
- Timeouts (120 s route cap, 90 s upstream), at most 1 SDK retry
- Controlled, generic error messages (no internals leaked)

**Be aware:** client-side limits (question count, frame count) can be bypassed
by anyone crafting requests directly; the server re-validates shapes and
sizes, but there is no per-IP rate limit yet. Recommended safeguards:

1. **Anthropic spend limit**: Console → Billing → set a monthly spend cap.
2. **Vercel spend management**: Project → Settings → Billing/Spend Management →
   set a pause threshold.
3. **Kill switch**: remove `ANTHROPIC_API_KEY` from the Vercel environment and
   redeploy (or pause the project) — the API then returns a friendly 503.
4. **Later**: add per-IP rate limiting (e.g. Vercel Firewall rate rules or an
   Upstash-based limiter) before promoting beyond a hobby preview.

## Deployment

- **GitHub**: `https://github.com/mvgrieken/spatiallab`
- **Vercel**: project `spatiallab`; preview deploys from branches, production
  from `main` (production is only promoted after manual iPhone verification).
- Set `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` and `NEXT_PUBLIC_SITE_URL` per
  environment via `vercel env add` (never commit secrets).

## Known limitations

- Frame selection captures 9 time-spaced candidates and drops near-black /
  blown-out ones by mean luminance; blur is not detected.
- Answers depend heavily on sweep quality (light, speed, coverage).
- Marker positions are the model's rough visual estimate — never precise.
- No server-side per-user rate limiting yet (see above); the email+password
  login gate blocks anonymous API use in the meantime.
- Question limits: 3 per scan, 9 per browser session (sessionStorage-backed,
  survives refresh; clearable by the user like any client-side state).
- iPhone/Safari behavior must be verified on a physical device
  (see `docs/iphone-testing.md`).

## License

MIT — see [LICENSE](./LICENSE).
