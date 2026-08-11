# What automated validation actually caught

Every experiment was validated before a human ever used it, with synthetic
inputs: box-shaped rooms as camera frames, a generated impulse instead of a
clap, known test addresses, and a headless browser driving the real UI with a
fake camera and fake microphone.

That validation found real bugs. This file records them, because they are the
honest material for the public "where it fails" page — and because none of
them were written down anywhere until now, which meant the knowledge lived
only in a session transcript.

**What this validation could not do:** decide whether an answer is *useful* in
a real living room. It proves the machinery works, not that the output is
worth reading. That is what the owner's real-room pass is for, and its
findings belong at the bottom of this file.

---

## 1. The analysis that never finished (#001, #002)

**Symptom.** A scan would sit on "Analyzing" until the request died, with no
error and no retry offer. Found by the automated browser run, not by reasoning
about the code.

**Cause.** A chain of timeouts that nobody had lined up against each other.
Reasoning effort defaulted high, which pushed a six-frame analysis past 90
seconds. The SDK then retried — doubling the wall-clock — while the serverless
route capped out at 120 seconds. The route died mid-retry, so the browser
never received either a result or an error.

**Fix.** Effort pinned to `medium` (measured ~30 s per analysis with no visible
quality loss), SDK timeout raised to 150 s with retries disabled, route cap
raised to 180 s, client abort at 170 s. Each layer now outlives the one inside
it, so a failure surfaces as a readable error instead of silence.

**What it says about the product.** The failure was not the model being wrong.
It was four independent timeouts, each defensible on its own, adding up to a
hang. Sequencing timeouts is the kind of thing that looks fine in review and
only shows up when something actually runs slowly.

---

## 2. Confidently wrong buildings (#004 Solar Roof)

**Symptom.** Typing a nonsense address returned a real roof, rendered in 3D,
with a solar score. Nothing in the interface suggested anything was wrong.

**Cause.** The PDOK Locatieserver does fuzzy matching. Given garbage it
returns its best guess with a low relevance score, and the code was accepting
any result at all.

**Fix.** A minimum relevance score (`MIN_ADDRESS_SCORE = 8.5`); below it the
lookup reports "not found" rather than guessing.

**What it says about the product.** This is the failure mode this whole
project is about. The system was not uncertain and hiding it — it had no idea
it was wrong, and neither did the interface. An answer delivered with full
confidence about the wrong building is worse than no answer, and no amount of
disclaimer text at the bottom of the page fixes that.

---

## 3. Claiming AI where there is none (#003, #004)

**Symptom.** "Experimental AI output" appeared under experiments that call no
model at all. #003 computes geometry from dimensions the user types; #004
reads public building data.

**Cause.** A single site-wide disclaimer written when every experiment used
AI, never revisited when experiments stopped using it.

**Fix.** A per-experiment disclaimer in the registry, and the site-wide text
narrowed to "Experimental output".

**What it says about the product.** A project whose pitch is honesty was
overstating its own use of AI — in the safety text, of all places. Boilerplate
copied across features is exactly where this kind of drift hides.

---

## Also found and fixed

Smaller, and less interesting to a reader, but recorded so they are not
rediscovered:

- **3D BAG integration** (#004): the `/collections` endpoint hung, so the
  coordinate transform is taken from the item response instead; `bbox-crs`
  must be `EPSG/0/7415`; the BAG WFS lives under `/kadaster/`, not `/lvbag/`
  (which 404s).
- **Sitemap unreachable** (site): `robots.txt` publicly pointed at a sitemap
  that sat behind the access gate.
- **Stale navigation** (site): the header linked hard to #001 while five
  experiments existed.
- **Address in the query string** (#004): the route carefully avoided logging
  the address, but it travelled in the URL, so the hosting platform's request
  logs captured it anyway. Moved to the request body.

## Not yet validated by a human

- Whether any answer is *useful* in a real room (#001, #002).
- AR at true size on a physical iPhone (#003) — never run on real hardware.
- Whether iPhone microphone hardware honours the request to disable automatic
  gain, echo cancellation and noise suppression (#005). If it does not, the
  RT60 numbers are wrong in a way no synthetic test can reveal.
