# Stool Scout

A mobile-first JavaScript prototype for stool-photo check-ins, description-based fallback, and simple gut-health insights.

## What this is

This is an **educational wellness MVP**, not a medical diagnostic tool.

The current prototype is built around a more realistic user flow:
- start on a **take/upload photo** screen
- optionally **skip the photo and describe it instead**
- choose a Bristol stool type and observed color
- mark warning flags and add notes
- submit the check-in to a real **`/api/analyze` server route**
- land on a **results screen** with:
  - stool type read
  - gut rhythm / gut bacteria interpretation
  - conservative nutrition suggestions
  - warning language when the input looks concerning
  - analysis-engine messaging that keeps the prototype honest while preparing for a future vision-model swap

## Product direction

The intended product shape is:
1. **photo-first on mobile**
2. **AI-assisted image interpretation**
3. **description fallback** when users do not want to upload an image
4. **results page** that explains what the stool may mean and suggests practical next steps

Right now the “AI” part is still an honest MVP bridge:
- image upload/capture is real
- the client posts structured inputs to a real analysis API route
- result generation is guided/rule-based by default on the server
- if `OPENAI_API_KEY` (or `STOOL_SCOUT_OPENAI_API_KEY`) is set, the photo route can now call a live vision model first and then hand the result into the conservative rules layer
- live vision only overrides the user's structured inputs when the server gets a high-confidence read, image quality is not unclear, and no stronger caution signals are already present
- the UI is now structured so a real vision model can plug into the existing API seam without rebuilding the product flow

## Why the MVP is structured this way

Night-one / rebuild goal: get a demoable product working quickly in JavaScript without pretending we already have medical-grade image intelligence.

That gives us a clean bridge to later work:
- image analysis in an API route
- private history / trends
- auth and privacy controls
- mobile packaging or app-store path

## Stack
- Next.js (App Router)
- React
- Tailwind CSS
- Plain JavaScript

## Run locally
```bash
npm install
npm run dev
```

Then open:

```bash
http://localhost:3000/
```

### Optional live vision setup

If you want the photo flow to do a real model pass before the conservative rules layer:

```bash
cp .env.example .env.local
```

Then set one of:

```bash
OPENAI_API_KEY=your_key_here
# or
STOOL_SCOUT_OPENAI_API_KEY=your_key_here
```

Optional model override:

```bash
STOOL_SCOUT_VISION_MODEL=gpt-4.1-mini
```

Without a key, the app safely falls back to the current rule-based prototype behavior.

## GitHub / handoff readiness

This repo now includes a lightweight handoff package for another builder:
- `README.md` — setup, product framing, and demo expectations
- `.env.example` — optional live-vision environment template
- `docs/demo-qa-checklist.md` — repeatable demo smoke test
- `docs/github-handoff.md` — what an outside reviewer or contributor should know before picking it up

Before sharing the repo externally, do a final hygiene pass:
- keep `node_modules/` and `.next/` out of version control
- run `npm run lint`
- run `npm run build`
- verify one happy-path and one caution-path mobile demo

## Project structure

- `src/app/page.js` — mobile-first capture / describe / results flow
- `src/app/layout.js` — app metadata and shell
- `src/app/globals.css` — global styles
- `src/lib/analysis.js` — conservative stool insight rules and explanation layer
- `src/lib/vision.js` — optional live vision handoff for photo-assisted runs
- `src/app/api/analyze/route.js` — server analysis route and vision override policy
- `docs/demo-qa-checklist.md` — repeatable demo and sample-image QA checklist
- `docs/github-handoff.md` — repo-sharing and contributor handoff notes
- `public/demo-images/` — bundled PNG photo fixtures for repeatable no-camera demos
- `.env.example` — optional live-vision environment template
- `eslint.config.mjs` — ESLint 9 flat config

## Demo QA

Use `docs/demo-qa-checklist.md` before a live review to verify:
- happy-path and caution-path demo scenarios
- photo upload behavior with and without a live API key
- conservative override-policy behavior when user caution flags are stronger than the vision read
- mobile readability and save-to-history flow
- seeded demo-history presets for stable-week and rough-patch tracker stories
- bundled PNG sample-photo fixtures that can be loaded directly inside the app for repeatable photo-first demos
- one-tap demo packs that preload photo fixture + guided inputs + seeded history for a faster founder walkthrough
- in-app presenter mode cards that tell the operator what to say next, show which pack is live, and provide a one-tap analysis trigger/reset during the walkthrough
- history-entry reuse buttons that turn a saved check-in back into a prefilled follow-up draft so the tracker story can continue without retyping everything on mobile
- follow-up comparison messaging that shows how a newly analyzed reused draft changed versus the prior saved entry
- tracker recommendation cards in saved history that convert recent entries into a concrete next-step read instead of a passive log
- recovery outlook cards in saved history that explain whether the recent pattern looks like early recovery, deterioration, settling, or a mixed signal
- a compact recent-trend score card that turns the last few saved entries into an at-a-glance stability / caution read for faster demos
- a follow-up window card that turns recent logging cadence plus trend direction into a concrete next-check-in recommendation
- a pattern rail in saved history that plots each recent entry on the Bristol scale so a reviewer can read the tracker story at a glance
- a “Why this result” explanation card that surfaces the main reasoning bullets, caution drivers, and note context so the result reads like a transparent product decision instead of a black box
- a mobile sticky action dock that keeps the next best CTA visible on phone screens during capture, analysis, and result review
- native share-sheet handoff for both the current result summary and saved-history summary, with copy-to-clipboard fallback when Web Share is unavailable
- auto-scroll handoff after analyze and save so phone demos land directly on the result and tracker sections instead of making someone hunt through the page

## Suggested next steps

1. Add real vision-model integration behind the existing `/api/analyze` route
2. Let the model extract likely stool traits from the image before asking follow-up questions
3. Add richer trend views on top of the private saved check-in history
4. Expand the built-in sample-photo fixture set beyond the current bundled PNGs so QA can cover more realistic lighting and edge cases
5. Add more presenter automation on top of the new in-app presenter mode (for example: timed script beats or packaged result-state jumps for specific investor demos)
6. Prepare for React Native / Expo or native wrapping if App Store becomes the goal

## Important note

If a user has severe pain, persistent symptoms, black stool, or visible blood, the app should direct them toward professional medical advice instead of pretending to diagnose anything.
