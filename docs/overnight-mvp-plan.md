# Stool Scout Overnight MVP Plan

## Goal for morning review
Have a more product-like version of Stool Scout ready for Scott to open in the morning that feels less like a demo toy and more like an MVP shell.

## Product direction
Ship the next version as a **private, wellness-positioned stool tracking app** with:
- a fast phone-first intake flow
- clear result explanations
- stronger follow-up guidance
- a more believable ongoing tracker story
- honest language about limitations and safety

## What this overnight iteration should improve
1. **Reduce demo-ness**
   - make the opening flow feel more like a user product than a pitch deck
   - reduce sections that are useful for selling but noisy for real usage

2. **Increase actionability**
   - make the results page answer: what does this likely mean, what should I do today, when should I check again

3. **Strengthen tracker value**
   - make saved history feel like a real habit product
   - turn history into pattern summaries, not just cards

4. **Prepare for real app build-out**
   - clarify the MVP stack and next technical milestones
   - keep the current API seam intact for later auth/storage/vision work

## Overnight scope
### In-product work
- tighten the hero and intake copy
- improve onboarding / first-run framing
- make the primary call-to-action sequence clearer on mobile
- improve result explanation blocks and next-step recommendations
- strengthen tracker summary language
- add a more product-like “how to use this” / “what to track” experience if it fits cleanly

### Repo / planning work
- create a concrete MVP plan doc
- update STATUS.md and TODO.md during progress
- commit meaningful progress

## MVP architecture after this overnight pass
### Current shell
- Next.js app router frontend
- local-only saved history
- `/api/analyze` route for conservative server-side analysis
- optional future vision handoff seam in `src/lib/vision.js`

### Next real-app milestones
1. auth
2. persistent database-backed check-ins
3. private account history and trends
4. image storage
5. real image-analysis pipeline with conservative override rules
6. privacy / consent / retention settings
7. subscription or paid feature gating if wanted

## Morning success test
By morning the app should feel:
- easier to understand on first open
- more useful after a single check-in
- more believable as an actual product
- cleaner on phone
- ready for Scott to review and react to
