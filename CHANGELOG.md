# Changelog

All notable changes per experiment/release. Details per release live in
`docs/releases/`.

## [Launch groundwork] — 2026-08-06 (preview)

Preparation for taking the gate off, from the CEO review of 2026-08-06.

- **Counter store** (`src/lib/store/`): Upstash Redis (Frankfurt/EU) over the
  REST API, no SDK. Never throws, never blocks a user-facing answer, and is
  silently inert without credentials. The only place SpatialLab persists
  anything, and it holds counters and short-lived technical keys only.
- **Honesty score (E1)**: one-tap "was this right?" under the two AI
  experiments (#001, #002), and a public `/stats` page. Site-wide tally, one
  vote per client per day, and no percentage below 20 votes — below that a
  number would say more about chance than about the model. #003/#004/#005 do
  not carry the question: their answers are not the model's judgement, so
  folding them in would flatter the number.
- **Daily analysis budget**: paid routes count against a per-UTC-day ceiling
  (`DAILY_ANALYSIS_BUDGET`, default 300) and return a graceful "budget used up"
  state instead of failing. Fails open when the store is unreachable.
- **Error tallies**: one counter per failure class (`config`, `refused`,
  `invalid_output`, `upstream`, `geo_upstream`), so a bad launch can be told
  apart from a broken endpoint.
- **Privacy fix**: the roof lookup moved from `GET ?q=<address>` to a POST
  body. Platform request logs record path and query string, so the address was
  reaching infrastructure logs regardless of what the route itself logged.
- **Share cards (E2)**: "Share this result" on all five experiments composes a
  1200×630 PNG on-device from the visitor's own result and hands it to the
  native share sheet, with a download fallback. Both WebGL renderers now set
  `preserveDrawingBuffer` so the canvas can be captured; #005 draws its decay
  curve straight onto a canvas rather than rasterising the on-screen SVG,
  whose CSS custom properties would not survive. No hosted image, so no link
  preview — that would mean storing user content.
- **"How it works" pages (E3)**: one route `/how/[slug]` driven by the
  registry, linked from every experiment. Each page states the pipeline, what
  the experiment *cannot* do, and links to the code that does the work.
  `CODE_REF` in `src/lib/site.ts` pins those links; set it to a release commit
  at launch.
- **"Where it fails" page**: a public page listing the three bugs automated
  validation caught before launch, what each says about the technology, and
  what is still unverified. Recorded in `docs/validation-findings.md` first —
  none of it was written down anywhere before.
- **Room comparison (#005)**: measurements can be kept and shown side by side,
  scaled against a fixed two-second ceiling so adding a very live room does not
  shrink the others. A reverberation time means little alone; beside a hallway
  it means something.
- **Deep links**: #003 takes `?type=&w=&d=&h=` (the object type is part of the
  link because it decides the geometry and the valid ranges). #004 takes the
  address in the URL *fragment*, which browsers never send to the server, so a
  shared roof link cannot put an address into request logs. Prefilled only —
  a link never fires a lookup on someone's behalf.
- **Desktop layout (#004)**: the one experiment with no camera and no
  microphone now uses a wider column on large screens, with the 3D roof beside
  the plane list.
- **#002 → #003**: for the two goals that have a counterpart (desk, storage),
  the result links through to Does It Fit. The link carries the object type
  only — #002 never learns any dimensions — and the wording says exactly that.
- **Verified**: `ANTHROPIC_INFERENCE_GEO=eu` is invalid — the API accepts only
  `global` and `us`, and `eu` returns HTTP 400 on every call. EU-resident
  inference needs Bedrock EU or Vertex, not this flag.

## [#005 — Room Acoustics] — 2026-08-05 (preview)

Fifth experiment: one clap estimates your room's reverberation time (RT60),
recorded and analysed entirely on-device — no upload, no AI. Schroeder
integration with a T20 fit, validated against synthesized decays with known
T60. See `docs/releases/005.md`.

## [#004 — Solar Roof] — 2026-08-05 (preview)

Fourth experiment: type a Dutch address and see that roof in 3D from open
aerial-LiDAR data (3D BAG / AHN) — orientation, slope, area and an indicative
solar score per roof plane. Keyless open-data pipeline (Locatieserver → BAG
WFS → 3D BAG), pure tested roof math, no AI, address never stored. See
`docs/releases/004.md`.

## [#003 — Does It Fit?] — 2026-08-04 (preview)

Third experiment: parametric furniture at true size — pick a type, set real
dimensions, preview in 3D and place it in your room via AR Quick Look from
Safari. Fully on-device (no AI, no backend, no upload). USDZ export validated
structurally; physical iPhone AR check pending. See `docs/releases/003.md`.

## [#002 — Find the Best Spot] — 2026-08-04 (preview)

Second experiment: scan once, pick a goal (desk, TV, reading chair, plant,
play area, storage) and get ranked placement spots on your own room's frames —
best spot, alternative, honest trade-offs and one place to avoid. Reuses the
full #001 chain; new are only the prompt, schema+repair, one API route and the
experiment UI. Awaiting physical iPhone validation. See `docs/releases/002.md`.

## [#001 — Ask Your Room] — 2026-08-04

First experiment, live at https://spatiallab.atthis.ai. Film a room for ten
seconds (or upload 3–6 photos); the AI describes what it sees and answers up
to three questions, every answer visually anchored to a real frame with a
marker and a confidence label. See `docs/releases/001.md`.

Post-release hardening (same week): email+password access gate (private
preview), fleet killswitch, luminance-based frame selection, session-wide
question cap, and the reuse refactor (registry, shared layout, typed AI
runner, UI kit) preparing for #002.
