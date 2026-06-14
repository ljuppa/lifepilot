# Architecture Review — Phase 1 Complete
**Date:** 2026-06-14
**Reviewer:** Winston (System Architect)
**Scope:** LifePilot Phase 1 — 7 Epics, 15 Migrations, 496 Tests

---

## Summary Verdict

> Phase 1 shipped exactly the architecture that was designed. Core decisions held across all 7 epics with no structural drift. The additions made during implementation (admin service layer, email template layer, rate-limit utility) are good engineering that should be codified in the architecture doc. Two security gaps (CSRF, admin rate limiting) and one functional gap (`target_value` on goals) are the priority items before user testing.

---

## Alignment Check — Designed vs. Built

| Decision | Designed | Built | Status |
|---|---|---|---|
| Next.js App Router + RSC | ✓ | ✓ | ✅ Aligned |
| Supabase Auth cookie-based sessions | ✓ | ✓ | ✅ Aligned |
| Route protection middleware (proxy.ts) | ✓ | ✓ | ✅ Aligned |
| Middleware trailing-slash guard | Deferred in Epic 5 | Fixed in proxy.ts | ✅ Resolved |
| Zod schemas in `lib/validation/` | ✓ | ✓ | ✅ Aligned |
| REST error format `{ error: { code, message } }` | ✓ | ✓ | ✅ Aligned |
| Rate limiting on auth endpoints | ✓ | `lib/rate-limit.ts` (Upstash + in-memory fallback) | ✅ Aligned |
| Inngest for background jobs | ✓ | 5 functions: generateBriefing, retentionCleanup, checkInactivity, exportUserData, sendBroadcast | ✅ Aligned |
| Audit logging (no PII in metadata) | ✓ | ✓ covers: consent, export, deletion, admin lookup, broadcast | ✅ Aligned |
| AI content disclosure (AiDisclosureWrapper) | ✓ | ✓ | ✅ Aligned |
| Haiku for briefing generation | ✓ | ✓ | ✅ Aligned |
| Safety filter on LLM output | ✓ | ✓ | ✅ Aligned |
| Supabase CLI migrations | ✓ | 15 migrations shipped | ✅ Aligned |
| CAN-SPAM compliance | ✓ | Briefing + re-engagement + broadcast emails all compliant | ✅ Aligned |
| React-hook-form + Zod on forms | ✓ | ✓ | ✅ Aligned |
| loading.tsx per route segment | ✓ | ✓ | ✅ Aligned |
| Inngest event naming `{domain}/{entity}.{verb}` | ✓ | ✓ | ✅ Aligned |
| Rate limiting on admin endpoints | ✗ | ✗ | ❌ Gap |
| CSRF protection on mutating routes | Implicit (OWASP Top 10) | ✗ | ❌ Gap |
| OpenAPI spec generation | Deferred to Phase 2 | Deferred | ⏳ Planned |

---

## Additions Made During Implementation

These weren't in the original architecture document but are good engineering that should be codified:

### `lib/admin/` — Admin Service Layer
- `getMetrics.ts` — DAU, delivery rate, check-in rate, total users (via service-role client)
- `getUserData.ts` — per-user email delivery lookup with parallel queries + audit log
- **Pattern established:** every admin operation goes through a shared service function; route handlers delegate to service, never query DB directly. Recommend documenting this in the architecture doc.

### `lib/email/templates/` — Email Template Layer
- `briefing.ts`, `dataExport.ts`, `broadcast.ts`
- **Pattern established:** `buildXxxEmail(data): { subject, html, text }` — all three formats always returned together.
- **⚠️ `escapeHtml` is duplicated** in `dataExport.ts` and `broadcast.ts`. Should be extracted to `lib/utils/html.ts` and imported by both. This is the only structural duplication found in the codebase.

### `lib/rate-limit.ts` — Rate Limit Utility
- Upstash sliding window with in-memory fallback for local dev and CI
- Currently applied only to auth routes (`/api/auth/sign-in`, `/api/auth/sign-up`, `/api/export`)
- Should be extended to admin endpoints in Phase 2

### Admin Route 4-Step Guard Pattern
Emerged across 7.1 → 7.2 → 7.3 and hardened through code review:
```
1. Env var check (SUPABASE_SERVICE_ROLE_KEY present)
2. Session auth (JWT — no DB hit)
3. Input validation (Zod — no DB hit)
4. Role DB check (profiles.role === 'admin')
5. Business logic
```
This pattern is not documented in the architecture doc. It should be added to the Implementation Patterns section alongside the standard Route Handler pattern.

### `_bmad-output/implementation-artifacts/deferred-work.md`
Backlog of 18 deferred items accumulated across all 7 epic code reviews. Good practice; should be reviewed at the start of each Phase 2 track.

---

## Security Posture

### Strong
- RLS at DB level for all user data — second defence layer (enforced even if route auth fails)
- Session-scoped queries everywhere — `user.id` from verified session, never client-supplied
- Rate limiting on auth routes — Upstash 5 req/15 min per IP, with safe fallback
- Audit log with no PII — covers all sensitive admin actions
- HTML escaping on email templates — applied after two-round code review
- HMAC-SHA256 unsubscribe tokens — timing-safe verification
- Input validation before any DB operation — consistent across all routes

### Gaps (Priority for Phase 2)

| Gap | Risk | Recommended Fix |
|---|---|---|
| No CSRF on mutating admin routes | Compromised admin session can be exploited via cross-origin request | Add `Origin`/`Referer` check in admin route handlers, or adopt `next-csrf` |
| No rate limiting on `/api/admin/*` | Unlimited broadcast sends from compromised admin session | Apply `checkRateLimit` with a tighter window (e.g. 3 req/hour for broadcast) |
| `isSafeUrl` allows `http://` | Low risk (LLM output validated at generation time), but inconsistent | Restrict to `https://` only |

---

## Functional Gaps (from deferred-work.md)

| Gap | Impact | Priority |
|---|---|---|
| `target_value` missing from goal form | Progress bars show "No data yet" for ALL users — product is broken for core feature | **High — fix before user testing** |
| Future-dated check-ins not rejected | Finance sum and wellness average can be inflated | Medium |
| Goal 3-limit TOCTOU race | Concurrent requests can exceed 3-goal limit | Low (race window is very narrow) |
| Exports bucket no DELETE policy | Old export files accumulate in storage | Low (no cost impact at small scale) |
| Dialog missing `aria-labelledby` | Screen readers can't identify modal purpose | Medium (accessibility) |
| `setMonth(-6)` overflow in retention | Errs toward earlier deletion (privacy-safe) — only on specific run-dates | Low |

---

## Scale Constraints to Document

| Constraint | Current Limit | Mitigation in Place |
|---|---|---|
| Supabase PostgREST default cap | 1,000 rows | Pagination with `PAGE_SIZE=1000` (added in 7.3); `get_dau` RPC bypasses cap |
| Inngest step ceiling | ~1,000 steps | `BATCH_SIZE=100` handles up to 99,800 recipients; theoretical ceiling above current scale |
| Upstash free tier | 10k commands/day | Sufficient for MVP (5 sign-ins/IP/15min; auth paths only) |
| Vercel Hobby tier | 10s function timeout, 100 GB-hrs/month | Inngest handles long-running tasks; briefing pipeline stays within limits |

---

## Architecture Document Updates Required

The following additions/corrections should be made to `architecture.md`:

1. **Directory structure** — add `lib/admin/`, `lib/email/templates/`, `lib/rate-limit.ts`
2. **Admin route pattern** — document the 4-step guard as a named pattern in Implementation Patterns
3. **Email template pattern** — `buildXxxEmail()` signature + HTML escaping requirement
4. **Inngest step ceiling** — document 1,000-step limit and BATCH_SIZE strategy
5. **Supabase 1k row cap** — document PostgREST default and when to use pagination vs. RPC
6. **Middleware file name** — architecture says `middleware.ts`; actual file is `proxy.ts` (minor but should match)
7. **`escapeHtml` extraction** — document shared utility location once extracted to `lib/utils/html.ts`
8. **Migration count** — 15 migrations shipped (0–15)

---

## Phase 2 Architecture Priorities

### Before User Testing (blocking)
1. **Fix `target_value` on goals** — core product feature is non-functional
2. **CSRF protection** — security baseline before real user sessions
3. **Admin rate limiting** — specifically broadcast endpoint (3 sends/hour is sensible)

### Phase 2 Early Sprint
4. **Extract `escapeHtml` to `lib/utils/html.ts`** — prevent future duplication
5. **Architecture doc update** — codify patterns added during Phase 1
6. **OpenAPI spec** — prerequisite for iOS client integration
7. **Exports bucket lifecycle rule** — storage hygiene

### Phase 2 Later
8. **`isSafeUrl` https-only** — tighten security on briefing links
9. **Dialog accessibility** — `aria-labelledby` on all modal dialogs
10. **Wellness average by distinct day** — metric correctness for daily briefing
11. **Inngest cron timezone documentation** — operational clarity

---

## Migration Inventory (15 shipped)

| # | Migration | Purpose |
|---|---|---|
| 001 | `audit_logs` | Append-only audit trail |
| 002 | `profiles` | User profile with goals and health domains |
| 003 | `goals` | Goal tracking with domains |
| 004 | `checkins` | Daily check-in records |
| 005 | `checkins_unique_day` | One check-in per user per day constraint |
| 006 | `briefings` | Briefing storage with email_status |
| 007 | `reengagement_tracking` | Re-engagement sent_at tracking |
| 008 | `storage_exports_bucket` | Supabase Storage bucket for data exports |
| 009 | `fix_exports_rls` | RLS fix for exports bucket |
| 010 | `retention_indexes` | Indexes for retention job queries |
| 011 | `profiles_pending_deletion` | Soft-delete flag for GDPR account deletion |
| 012 | `add_admin_role` | `role` column on profiles (`user`/`admin`) |
| 013 | `admin_metrics_rpc` | `get_dau()` Postgres RPC (bypasses 1k row cap) |
| 014 | `reengagement_notifications` | Notifications table with service_role grants |
| 015 | `broadcast_preference` | `broadcastEmails` default + backfill |

---

*Generated: 2026-06-14 — Winston (System Architect)*
*Architecture review for LifePilot Phase 1*
