# CLAUDE.md — SpatialLab

Durable working agreements for this repository. These override default
assistant behavior. Read `PROJECT.md` first — the design DNA there outranks
everything, including this file.

## Product principles

- **Mobile-first, iPhone Safari first.** Every feature must work one-handed,
  in portrait, on a narrow screen, before anything else.
- **The 30-second story is the product.** Open site → scan room → see an
  annotated answer, in ~30 seconds. Every feature must improve that story or
  it doesn't ship.
- **Estimates, not measurements.** Never claim LiDAR, exact dimensions or
  centimeter precision. Confidence and limitations are always visible.
- **No professional advice.** No structural, electrical, fire-safety, health,
  accessibility-compliance or installation advice — ever. The fixed
  redirect-to-a-professional response is intentional.
- **No user content, only anonymous aggregates.** SpatialLab keeps no database
  of frames, questions, answers, addresses or audio. Do not add persistence of
  user content. The one exception, added for the public launch, is a counter
  store (`src/lib/store/`, Upstash Redis in Frankfurt): site-wide vote tallies,
  error tallies, a daily analysis count, and short-lived hashed keys for
  dedupe and rate limiting that expire within 24 hours. A counter must never
  become a row about a person: no identifiers stored beside a value, no
  timestamps per event, no reference to what was analysed. If a feature needs
  more than an integer, it does not belong in this store.

## Engineering rules

- TypeScript strict mode stays on; no `any` escape hatches.
- Small, focused components; logic lives in `src/lib`, not in JSX.
- The model name lives only in `src/lib/config.ts` (`ANTHROPIC_MODEL` env).
- `ANTHROPIC_API_KEY` is server-side only (`server-only` guards the AI
  module). Never log request bodies, base64 data, or secrets.
- All model output goes through Zod validation with at most one controlled
  repair pass (`src/lib/validation/schemas.ts`).
- No premature platform abstractions: no monorepo, no plugin system, no
  generic "Spatial AI engine", no multi-experiment framework until a second
  experiment actually needs it.

## Rules for building experiments (future sessions)

- **No premature abstractions.** Refactor only after the second use; one
  occurrence is an implementation, not a pattern.
- **No platform building.** No generic plugin systems, no experiment SDK,
  no dynamic experiment loading. The registry is a typed array — keep it one.
- **Prefer composition over inheritance.** Experiments compose the shared
  pieces (layout, capture, AI runner, UI kit); they never extend base classes
  or implement framework interfaces.
- **Reuse only proven components.** New experiments build on
  `components/shared`, `components/ui`, `components/capture`, `lib/ai/client`,
  `lib/camera`, `lib/api-client`. Anything experiment-specific lives under
  `components/experiments/<slug>/` and `lib/ai/prompts/<slug>.ts`.
- **Keep experiments independent.** An experiment never imports from another
  experiment. Shared needs go through a promotion: prove it twice, then move
  it to shared.
- **New experiment checklist:** add a registry entry (`lib/experiments.ts`),
  a page under `app/experiments/<slug>/` using `ExperimentLayout`, prompts in
  `lib/ai/prompts/<slug>.ts`, a server task in `lib/ai/<domain>.ts` via
  `runVisionTask`, Zod schemas + repair in `lib/validation`, and a release
  note in `docs/releases/`.
- **Optimize for delight, not feature count.** Cut scope before adding
  scaffolding; the 30-second demo is the unit of value.
- Mock mode must remain impossible in production builds (`isMockMode()`).

## Forbidden operations

- Destructive git: no force-push, `git reset --hard`, `git clean -fd`.
- No deleting or overwriting existing GitHub repos or Vercel projects.
- No DNS changes or domain moves without explicit owner approval.
- No production deployment before the owner has verified the preview on a
  physical iPhone.
- Never commit `.env.local`, keys, tokens or debug image exports.

## Verification bar

Before calling work done: `npm run lint && npm run typecheck && npm test &&
npm run build`, plus a manual pass over `docs/iphone-testing.md` for anything
touching capture, analysis or the result view.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
