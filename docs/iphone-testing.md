# Manual iPhone test checklist — SpatialLab #001–#005

Run on a **physical iPhone in Safari** against the preview URL (HTTPS).
None of these can be verified without a real device — simulators and desktop
browsers do not reproduce Safari's camera permission model, microphone
hardware behavior, AR Quick Look, orientation behavior, or backgrounding
semantics.

Legend: ☐ = to test · noted per item what "pass" means.

**Order matters.** Run this pass *after* the launch build work is in, not
before: the feedback tap, share cards and the #005 comparison all change the
result screens listed here.

---

# Shared surfaces

## Feedback tap & track record

- ☐ **Tap appears**: below the result of #001 and #002 there is "Was this
  answer right?" with Yes / No. It is deliberately absent on #003, #004 and
  #005 — those answers are not the model's judgement.
- ☐ **Tap works**: tap one → it is replaced by "Thanks — that helps" with a
  link to the track record page. No spinner, no delay, no error.
- ☐ **Second tap impossible**: the buttons are gone after the first tap; you
  cannot vote twice on the same result.
- ☐ **Vote survives a bad network**: enable airplane mode, tap → the UI still
  shows the thank-you state (a dropped vote must never look like a failure).
- ☐ **Track record page**: `/stats` is reachable from the footer, readable in
  portrait, and shows either a percentage or a deliberate "not enough answers
  yet" state — never `0%` or `NaN`.

## Share cards

The card is composed on your own device from your own result — nothing is
uploaded, so there is no link preview; you attach the file yourself.

- ☐ **#001 / #002**: tap "Share this result" → the iOS share sheet opens with a
  1200×630 image showing your own frame with the marker on it, the answer, and
  spatiallab.atthis.ai. **Verified in an automated browser run.**
- ☐ **#003 / #004**: same, with the 3D view as the image. **Not verified
  anywhere yet** — headless browsers have no WebGL, so the canvas capture has
  only ever been reasoned about, never seen. If the image comes out blank or
  black, `preserveDrawingBuffer` is not doing its job on iOS Safari and the
  card needs a different capture route.
- ☐ **#005**: same, with the decay curve as the image. Drawn directly on a
  canvas rather than copied from the on-screen SVG, so check the curve, the
  dashed RT60 line and the dB labels are all actually present.
- ☐ **Cancel the share sheet** → back on the page, no error, button usable
  again.
- ☐ **Saved image is readable**: open it from Photos — text not clipped, image
  not stretched, marker where it was on screen.

## Cost & availability

- ☐ **Daily budget state**: with `DAILY_ANALYSIS_BUDGET` temporarily set to 1
  on preview, run two analyses → the second shows "Today's analysis budget is
  used up", not an error. Reset the value afterwards.
- ☐ **Kill switch**: flip `killswitch_spatiallab` in Edge Config → the site
  serves the maintenance page within ~10 s → clear it → the site returns.

## Pages & polish (all experiments)

- ☐ **Privacy page**: readable, reachable from header and footer; the US
  processing paragraph and the counter list are legible in portrait.
- ☐ **VoiceOver basics**: headings announced; primary buttons labeled; status
  updates announced (aria-live); marker info also available as text.
- ☐ **Reduced motion**: Settings → Accessibility → Motion → Reduce Motion →
  no pulsing marker animation, no entrance animations; progress still legible.
- ☐ **Dark mode**: system dark → dark theme, AA-readable text, marker visible.
- ☐ **Light mode**: system light → paper theme, AA-readable text.
- ☐ **Share preview**: share the site URL in iMessage → OG card shows
  SpatialLab branding.
- ☐ **No horizontal scrolling anywhere**, in any experiment, in portrait.

---

# #001 Ask Your Room

## Camera & permissions

- ☐ **Accept camera**: Tap "Scan my room" → "Enable camera" → Safari prompt
  appears → Allow → live rear-camera preview shows within ~2 s.
- ☐ **Deny camera**: Deny the prompt → app shows the "Camera access declined"
  screen with working "Upload photos instead" and "Try again" (no dead end).
  Re-allowing may require Safari page settings (aA menu → Website Settings).
- ☐ **Rear camera used**: preview shows the environment-facing camera, not
  the selfie camera.
- ☐ **Photo upload fallback**: complete the entire flow (analysis + 3
  questions) using 3–6 photos from the library instead of the camera.

## Scan behavior

- ☐ **Portrait orientation**: whole flow usable one-handed in portrait.
- ☐ **Sweep instructions**: during the 10 s scan the hints rotate (Move
  slowly → Show the floor and walls → Avoid fast turns → Almost done) and the
  progress bar completes.
- ☐ **Cancel**: cancel mid-scan → camera light goes off (stream stopped),
  back at intro.
- ☐ **Minimize Safari mid-scan**: swipe to home mid-scan, return → scan is
  cleanly interrupted with a retry screen (no frozen video, no crash).
- ☐ **Dark room**: scan a dark room → either a usable low-confidence result
  or a clear error — never a hang.
- ☐ **Large room / small room**: both produce observations that reference
  actually visible things.

## Analysis & results

- ☐ **Slow connection**: throttle (Settings → Developer → Network Link
  Conditioner, or real bad signal) → status steps remain honest, request
  either completes or fails with a readable error + retry.
- ☐ **Result view**: summary, ≤3 observations, annotated frame with visible
  marker inside the image bounds, confidence labels shown as High
  confidence / Likely / Uncertain.
- ☐ **Frame browsing**: ←/→ browse frames; marker only on its own frame;
  "Back to marked frame" works.
- ☐ **Three questions**: ask 3 questions (suggested chips + free text); each
  gets an annotated answer.
- ☐ **Fourth question blocked**: after 3 questions the input is replaced by
  the "three questions per scan" notice.
- ☐ **API error handling**: with the API key temporarily removed from the
  preview env, analysis shows the friendly configuration notice (503), not a
  crash or mock data.
- ☐ **Timeout**: if analysis exceeds ~2 min, the UI shows the timeout error
  with retry (hard to force; acceptable to verify via airplane mode mid-request).
- ☐ **Scan another room**: resets cleanly to intro; old frames/questions gone.
- ☐ **Refresh mid-session**: pull-to-refresh on the result → back to intro,
  no stale state, question counter reset (known limitation).

---

# #002 Find the Best Spot

- ☐ **Goal chosen before scanning**: the goal picker appears first and the
  scan only starts after a goal is selected.
- ☐ **Ranked result**: a best spot and at least one alternative, each with an
  honest trade-off, plus an "avoid" entry where the model has one.
- ☐ **Markers land on the right frames**: each suggested spot's marker sits
  inside the image and on a plausible surface, not floating in a doorway.
- ☐ **Try another goal**: pick a second goal → new ranking appears **without
  re-filming**, using the same scan.
- ☐ **Goal budget exhausted**: after the last allowed goal, the button is
  replaced by a clear notice rather than failing.
- ☐ **The answer is actually useful**: for at least one real room, would you
  act on the suggestion? Note where it is plausible but useless — that
  judgement is the point of this pass and belongs on the "where it fails" page.

---

# #003 Does It Fit? (AR — highest device risk)

This experiment has never run on real hardware. AR Quick Look cannot be
verified any other way.

- ☐ **Object type + dimensions**: pick a type, enter real dimensions; the 3D
  preview updates and is rotatable by touch.
- ☐ **Invalid dimensions**: enter 0, a negative number, and something absurd
  (999 m) → clamped or rejected with a readable message, never a broken model.
- ☐ **AR button appears on iPhone**: the "View in your room" affordance is
  present in Safari on iOS (it is correctly hidden on desktop).
- ☐ **AR Quick Look opens**: tapping it opens Apple's own AR viewer, not a
  download prompt or a blank sheet.
- ☐ **True size**: the placed object measures what you typed. Check one
  dimension against a tape measure — this is the single claim the experiment
  makes, and the only way to falsify it is on the floor.
- ☐ **Return from AR**: closing Quick Look returns to the page with state
  intact.
- ☐ **Deep link**: open the experiment with prefilled parameters in the URL →
  the form is populated and the model matches.
- ☐ **No camera permission needed**: the experiment never asks for the camera
  (Quick Look handles that itself).

---

# #004 Solar Roof

- ☐ **Address lookup**: type a real Dutch address → the building is found and
  the roof renders in 3D.
- ☐ **Address not found**: type nonsense → a readable "not found" message, no
  crash, no wrong building silently shown.
- ☐ **Address with no 3D data**: try a very new building → the "no building
  data" path, not a spinner that never ends.
- ☐ **Slow open data**: 3D BAG has been observed taking 5–45 s → the status
  text stays honest for the whole wait and the request either completes or
  fails readably.
- ☐ **Roof interaction**: the 3D roof can be rotated by touch; planes are
  distinguishable; orientation, slope, area and the indicative score are
  readable in portrait.
- ☐ **Estimate framing**: nowhere does it read as a measurement or as advice
  about installing anything.
- ☐ **Address stays out of the URL**: the address is not visible in the
  address bar after a lookup (it now travels in the request body).

---

# #005 Room Acoustics (microphone — highest hardware risk)

Audio processing (AGC, echo cancellation, noise suppression) is deliberately
disabled. Whether iPhone hardware honours that is exactly what this tests.

- ☐ **Accept microphone**: Safari prompts, Allow → the level meter responds to
  sound within ~1 s.
- ☐ **Deny microphone**: → a clear dead-end-free screen with a way back.
- ☐ **Clap detected**: one sharp clap produces an RT60 estimate.
- ☐ **Too quiet**: tap gently → the "too quiet" refusal, not a nonsense number.
- ☐ **Too noisy**: run with a TV on → the "too noisy" refusal.
- ☐ **No impulse**: talk instead of clapping → the "no impulse" refusal.
- ☐ **Plausible values**: a small furnished room should land roughly in
  0.3–0.6 s; a bathroom or empty hallway clearly higher. Wildly wrong numbers
  here mean iPhone hardware is applying processing we asked it not to — that
  is a blocker, not a polish item.
- ☐ **Decay chart**: renders, is legible in portrait, and matches the number.
- ☐ **Room comparison**: measure two rooms in one session → both shown side by
  side; with only one measured, the empty state is graceful.
- ☐ **Backgrounding mid-recording**: swipe to home while recording, return →
  clean interruption, no stuck recorder, microphone indicator off.
- ☐ **Microphone released**: after a measurement the iOS recording indicator
  disappears.

---

## Cannot be verified without a physical iPhone

Everything under "Camera & permissions", "Scan behavior", all of #003's AR
items, all of #005's microphone items, VoiceOver, Reduce Motion, and true
Safari backgrounding behavior. Desktop Chrome/Safari smoke tests do not count
for these.

## What to write down while testing

For every item that fails or feels off, note the experiment, what you did,
what you expected, and what happened. Two of those notes become the "where it
fails" page; the rest become fixes before launch.
