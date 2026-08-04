# Manual iPhone test checklist — SpatialLab #001

Run on a **physical iPhone in Safari** against the preview URL (HTTPS).
None of these can be verified without a real device — simulators and desktop
browsers do not reproduce Safari's camera permission model, orientation
behavior, or backgrounding semantics.

Legend: ☐ = to test · noted per item what "pass" means.

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

- ☐ **Portrait orientation**: whole flow usable one-handed in portrait; no
  horizontal scrolling anywhere.
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

## Pages & polish

- ☐ **Privacy page**: readable, reachable from header and footer.
- ☐ **VoiceOver basics**: headings announced; scan/ask buttons labeled;
  status updates announced (aria-live); marker info also available as text.
- ☐ **Reduced motion**: Settings → Accessibility → Motion → Reduce Motion →
  no pulsing marker animation, no entrance animations; progress still legible.
- ☐ **Dark mode**: system dark → dark theme, AA-readable text, marker visible.
- ☐ **Light mode**: system light → paper theme, AA-readable text.
- ☐ **Share preview**: share the URL in iMessage → OG card shows SpatialLab
  branding (title, tagline, #001).

## Cannot be verified without a physical iPhone

Everything in "Camera & permissions" and "Scan behavior", VoiceOver, Reduce
Motion, and the true Safari backgrounding behavior. Desktop Chrome/Safari
smoke tests do not count for these items.
