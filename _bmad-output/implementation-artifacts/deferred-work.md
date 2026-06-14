# Deferred Work

## Deferred from: code review of 5-1-goal-progress-and-check-in-streak (2026-05-15)

- `target_value` field missing from GoalInputSchema and goal-creation form — every goal has `target_value = NULL` so progress bars always show "No data yet" in production; must add target_value to the add-goal form and POST schema (architectural fix needed, possibly Story 5.x or an enhancement to Story 2)
- Future-dated check-ins bypass stale check in `app/api/checkin/route.ts` — `age < 0` not rejected; can inflate finance sum and wellness average; fix: add `|| age < 0` to the stale check condition
- Goal creation 3-limit check is TOCTOU — non-atomic count-then-insert allows concurrent requests to exceed limit; mitigate with a serializable transaction or DB partial index
- `middleware.ts` `startsWith` path matching has no trailing-slash guard — theoretical false positives for future routes named e.g. `/goalssettings`; fix: use `p === path || path.startsWith(p + '/')`
- Wellness 7-day average denominator is row count not distinct day count — a user who checks in twice daily gets weighted equally to daily check-ins; reconsider averaging by day for true 7-day average

## Deferred from: code review of 4-3-briefing-history-and-helpfulness-feedback (2026-05-15)

- `isSafeUrl` allows `http://` URLs — design question; low risk in practice as AI-generated content is validated at generation time; consider restricting to https-only in a future security pass
- `greeting.slice(0, 100)` may cut mid-Unicode surrogate at byte 100 — cosmetic; low probability with English coaching text; fix with `[...text].slice(0,100).join("")` when internationalisation is needed
- `text-slate-500` used for `wellness` domain in `BriefingCard` DOMAIN_FILL — not a design token; unify with the token system when design tokens are audited
- 30-day briefing history cutoff computed with server-local `new Date()` — acceptable for daily granularity; consider explicit UTC arithmetic if the user base spans far-western timezones

## Deferred from: code review of 6-1-personal-data-export (2026-06-12)

- No DELETE policy on exports bucket — old export files accumulate indefinitely; add a storage lifecycle rule or a scheduled cleanup job in a future compliance story
- `upsert:true` overwrite race on concurrent exports — low risk once timestamp-outside-steps is fixed (P2); revisit if concurrent export protection becomes a requirement
- Missing `ALTER TABLE ENABLE RLS` in migration — Supabase Storage enables RLS on `storage.objects` automatically; not needed, noted for documentation clarity
- `userId` from Inngest event payload not validated as UUID — always sourced from verified Supabase session in this flow; add Zod validation if event bus ever becomes externally accessible

## Deferred from: code review of 6-3-automated-data-retention (2026-06-12)

- `setMonth(-6)`/`setFullYear(-1)` cutoff math overflows at month-end and leap-day run-dates (e.g. job on Aug 31 → briefings cutoff lands Mar 3, deleting ~2 extra days) — errs toward earlier deletion (privacy-safe), only on specific run-dates; revisit if exact month-boundary retention is ever required
- Retention index migration uses plain `create index` not `create index concurrently` — locks `checkins` writes during build on first apply; harmless pre-launch (no production rows), but switch to a concurrent/out-of-transaction migration before there is meaningful `checkins` volume
- Inngest cron `0 2 * * *` timezone — confirmed UTC by Inngest default; noted for documentation only

## Deferred from: code review of 6-2-data-summary-and-account-deletion (2026-06-12)

- Dialog component missing `aria-labelledby` pointing at DialogTitle — `div[role="dialog"]` has no accessible name; pre-existing pattern in the custom dialog component; fix when the component library is audited for accessibility
- Export and delete handlers can execute concurrently — both fetch calls can be in-flight simultaneously (independent `exportStatus`/`deleteStatus` guards); low probability in practice but an Inngest export job can be enqueued for a user mid-deletion; requires dedicated "account locked during deletion" state to fix cleanly
- Single check-in renders "Jan 2025 – Jan 2025" date range — cosmetic; consider suppressing the range display when oldest === newest

## Deferred from: code review of 7-3-system-wide-broadcast (2026-06-14)

- No CSRF / same-origin enforcement on the broadcast POST (and other mutating admin routes) — relies solely on cookie-based `auth.getUser()`; project-wide concern, fix when a CSRF strategy is adopted across all mutating routes
- No rate limiting on admin endpoints — a compromised admin session could trigger unlimited platform-wide sends; project-wide pattern, address when API rate limiting is introduced
