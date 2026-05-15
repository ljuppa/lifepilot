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
