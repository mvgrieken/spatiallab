# CLAUDE.md — SpatialLab

Durable working agreements for this repository. These override default
assistant behavior.

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
- **No image storage.** SpatialLab keeps no database of frames, questions or
  answers. Do not add persistence of user content in v1.

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
