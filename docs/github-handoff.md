# Stool Scout GitHub handoff notes

A lightweight handoff guide for putting this prototype in front of another builder without extra explanation.

## What a new collaborator should know first

- This is an **educational wellness prototype**, not a diagnostic product.
- The app is intentionally **mobile-first** and optimized for a fast demo flow.
- The default analysis path is conservative and rule-based.
- Optional live vision only runs when an API key is present and only overrides user inputs when the read is high-confidence, the image is clear enough, and stronger caution signals are not already present.

## Minimum handoff package

A clean repo handoff should include:
- `README.md` for setup, product framing, and demo expectations
- `.env.example` for optional live vision configuration
- `docs/demo-qa-checklist.md` for repeatable walkthrough testing
- `public/demo-images/` sample fixtures for phone demos without a live camera

## Fast start for a new builder

```bash
npm install
cp .env.example .env.local   # optional, only needed for live vision
npm run dev
```

Then open `http://localhost:3000/`.

## Suggested pre-share checks

Before sending this repo to someone else:
1. make sure `node_modules/` and `.next/` are not committed
2. run `npm run lint`
3. run `npm run build`
4. smoke-test one happy-path and one caution-path demo
5. confirm the app still reads as wellness guidance instead of fake medical certainty

## Demo-ready story to preserve

If someone is reviewing the repo cold, they should quickly understand this product story:
1. user starts from camera/upload on a phone
2. user can skip to description-based input if they do not want to upload
3. the check-in hits a real analysis route
4. results explain the likely read, cautions, and next steps in plain language
5. the result screen now previews the likely tracker takeaway plus projected trend score, follow-up window, and recovery outlook before the operator even jumps into full history
6. after save, history auto-opens with the newest entry highlighted so the result-to-tracker transition feels intentional in demos
7. saved history makes the product feel like a repeat-use tracker instead of a one-shot gimmick

## Known limitations

- Live image interpretation depends on a valid API key.
- The current history system is local prototype state, not authenticated persistent storage.
- This is not a medical device workflow and should not claim diagnosis.

## Best next contributor tasks

- wire authenticated persistent history
- strengthen trend views and follow-up recommendations
- expand the sample image fixture set
- harden the repo for external review and deployment
