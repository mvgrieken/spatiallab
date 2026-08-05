# PROJECT.md — the SpatialLab DNA

This document outranks the README. When a decision conflicts with anything
else, these principles win.

## What SpatialLab is

A series of small, self-contained browser experiments about what AI can infer
from the physical world. It is **not** a product, **not** a SaaS, **not** a
framework, and it must never become one.

## Principles

1. **One experiment = one idea.** If an experiment needs a second sentence to
   explain what it does, it is two experiments.
2. **The demo must be understandable within 30 seconds.** Open → try →
   wonder. Everything that delays that moment is cut.
3. **Visible evidence beats generic AI text.** Every claim points at
   something in a real frame. An answer without evidence is not shipped.
4. **Never fake precision.** Estimates are labeled as estimates; confidence
   is always shown; nothing pretends to measure.
5. **The video is as important as the software.** Each experiment should
   produce a moment worth recording and sharing.
6. **Build the smallest thing that creates wonder.** Scope is a design tool,
   not a limitation.
7. **No experiment should require login.** The current gate exists only while
   the site is a private preview; it is not part of any experiment.
8. **No experiment should become a product.** No accounts, no billing, no
   roadmap pressure. When an idea wants to be a product, it leaves SpatialLab.
9. **Refactor only after the second use.** One occurrence is an
   implementation; two is a pattern; only then is it shared code.
10. **Avoid building infrastructure for hypothetical future experiments.**
    The registry, the layout, the camera, the AI runner — everything shared
    exists because #001 proved it. Nothing exists "for later".

## What shared code may exist

Exactly what has been proven by a shipped experiment: the experiment registry
and layout, the capture components, the frame pipeline, the typed AI runner,
the UI kit (Button/Panel/TextInput), the progress/error surfaces, the
analytics wrapper, and the CSS design tokens. Additions to this list require
a second experiment that needs them.
