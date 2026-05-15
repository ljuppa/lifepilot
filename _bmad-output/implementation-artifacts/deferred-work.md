# Deferred Work

## Deferred from: code review of 4-3-briefing-history-and-helpfulness-feedback (2026-05-15)

- `isSafeUrl` allows `http://` URLs — design question; low risk in practice as AI-generated content is validated at generation time; consider restricting to https-only in a future security pass
- `greeting.slice(0, 100)` may cut mid-Unicode surrogate at byte 100 — cosmetic; low probability with English coaching text; fix with `[...text].slice(0,100).join("")` when internationalisation is needed
- `text-slate-500` used for `wellness` domain in `BriefingCard` DOMAIN_FILL — not a design token; unify with the token system when design tokens are audited
- 30-day briefing history cutoff computed with server-local `new Date()` — acceptable for daily granularity; consider explicit UTC arithmetic if the user base spans far-western timezones
