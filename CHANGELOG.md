# Changelog

All notable changes per experiment/release. Details per release live in
`docs/releases/`.

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
