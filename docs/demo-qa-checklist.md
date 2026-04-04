# Stool Scout Demo QA Checklist

A fast pre-demo checklist for making the prototype feel reliable, honest, and repeatable on a phone.

## Goal

Make sure the demo lands three product truths clearly:
1. the app is mobile-first
2. the app uses a real analysis route instead of a fake static card
3. the app behaves conservatively when image confidence is weak or caution signals are present

## Demo environments

### A) No API key available
Use this when showing the baseline prototype.

Expected outcome:
- upload/camera flow works
- `/api/analyze` still returns a result
- result page explains that the server route handled the check-in
- vision status explains that live vision was not applied

### B) API key available
Use this when showing the vision-assisted prototype path.

Expected outcome:
- upload reaches the server
- live vision attempts a read
- override policy is surfaced clearly
- user-selected structured inputs are only changed when the read is high-confidence, clear, and not contradicted by stronger caution signals

## Sample scenarios to verify

### 1) Clean routine / reassuring demo
Purpose:
- show the fastest happy-path product story
- ideal for first pass in a live demo

Recommended setup:
- mode: photo or "Steady routine" shortcut
- bristol type: 4
- color: brown
- flags: none
- notes: short normal-routine note

Check for:
- result feels calm and useful
- action ladder recommends light tracking, not panic
- save-to-history works
- history timeline updates cleanly

### 2) Firmer stool / travel constipation
Purpose:
- show that the app gives practical next steps, not generic fluff

Recommended setup:
- use the "Travel constipation" shortcut

Check for:
- constipation-style framing appears
- hydration/fiber guidance is concrete
- caution language stays measured, not alarmist
- next check-in plan feels reasonable

### 3) Loose stool / caution example
Purpose:
- show stronger caution handling without pretending to diagnose

Recommended setup:
- use the "Loose / caution example" shortcut

Check for:
- caution framing is stronger and obvious
- escalation triggers are visible
- copy stays wellness-positioned and non-medical
- save-to-history still works for trend-following

### 3b) Seeded tracker history presets
Purpose:
- make the tracker feel real immediately without manually creating several entries during the demo
- support the one-tap demo packs that preload a full product story in a single click

Recommended setup:
- tap either `Seed stable week` or `Seed rough patch`
- or use a one-tap demo pack to load photo fixture + guided inputs + seeded history together

Check for:
- timeline fills with multiple saved entries immediately
- trend snapshot, caution rate, and current streak cards all update coherently
- stable week preset reads calmer than rough patch preset
- seeded entries still look like realistic product data, not placeholder lorem ipsum
- presenter mode appears for one-tap packs and updates the talk track as you move from capture → describe → results
- once a result is live, presenter mode explicitly points at the `If you save this now` tracker-preview card before full history becomes the next beat
- the result screen also previews the projected trend score, follow-up window, and recovery outlook that would appear if the current result were saved

### 4) Photo uploaded, no API key
Purpose:
- prove the fallback path is still demo-safe

Recommended setup:
- either attach your own valid JPG/PNG/WebP or load one of the built-in sample fixtures
- keep mode on photo
- run analysis with no `OPENAI_API_KEY`

Check for:
- upload is accepted and validated
- built-in fixture buttons load a PNG into the same photo-first flow cleanly
- result still renders
- analysis engine card references the server route
- vision status explains why live vision was not applied

### 5) Photo uploaded, API key present, strong user caution flags
Purpose:
- verify the conservative override policy

Recommended setup:
- attach a valid image
- mode: photo
- include `blood` or `fever`
- run analysis with API key enabled

Check for:
- result renders normally
- vision section shows override policy was blocked
- reason should reflect strong user flags
- resolved structured inputs stay aligned with user selections

### 6) Unsupported or oversized file
Purpose:
- make sure the app fails safely and clearly

Recommended setup:
- try a non-JPG/PNG/WebP file, or an image above 8 MB

Check for:
- the app rejects the upload
- message is clear and human-readable
- previous demo state is not corrupted

## Phone UX checks

Before a live demo, verify:
- main hero and first CTA fit on a common phone viewport
- upload control is easy to tap
- demo shortcuts are visible without hunting
- result cards stack cleanly on mobile
- history section remains readable on a narrow screen
- the new pattern rail is readable on mobile and makes the recent tracker story obvious without opening every saved card
- long result sections still feel scannable, not like a wall of text
- the sticky mobile action dock stays visible and offers the right next CTA for capture, analysis, and result/history steps
- after tapping analyze, the page auto-lands on the result section instead of leaving the operator mid-page on mobile
- after saving a result, the page auto-lands on saved history so the tracker story continues without manual scrolling
- the newest saved entry is visually highlighted in history, making the result-to-tracker handoff obvious for a live demo
- result and history summaries can open the native mobile share sheet, with a clean clipboard fallback when sharing is not supported

## Presenter script

Use this flow if you need a reliable 30-60 second walkthrough:

1. Start on the home screen and say the app is an educational wellness tracker, not a diagnostic tool.
2. Launch a demo shortcut or attach/load a sample photo fixture.
3. Call analysis and point out that the app hits a real `/api/analyze` route.
4. On results, explain the plain-English result and the action ladder.
5. If a photo was used, point to the vision status / override policy.
6. Save the check-in and show the tracker history so the product feels like an ongoing tool, not a one-shot gimmick.

## Pass criteria before showing someone

The prototype is demo-ready enough for the next handoff when:
- lint passes
- build passes
- at least one happy-path demo works smoothly on mobile
- at least one caution-path demo works smoothly on mobile
- history save works
- the vision status card tells an honest story in both API-key and no-key setups
- the app never sounds like it is diagnosing disease
