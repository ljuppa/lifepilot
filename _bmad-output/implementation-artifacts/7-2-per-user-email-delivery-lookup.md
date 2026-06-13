# Story 7.2: Per-User Email Delivery Lookup

Status: done

## Story

As a platform operator,
I want to look up any user by UUID at /admin/users and see their account status, profile completeness, last 10 briefings, and last 5 re-engagement notifications,
So that I can diagnose email delivery issues for specific users.

## Acceptance Criteria

**AC1 — User lookup form:** Given an admin visits /admin/users, when they enter a user UUID and click Look Up, then the page shows that user's account status, profile completeness, last 10 briefings (date + email_status), and last 5 re-engagement notifications (sent_at + email_status).

**AC2 — UUID validation before DB:** Given an invalid UUID is submitted, when the server processes it, then it returns 400 VALIDATION_ERROR without issuing any database query.

**AC3 — Not found:** Given a valid UUID that does not exist in auth.users, when the lookup runs, then 404 NOT_FOUND is returned.

**AC4 — Audit log:** Given a successful lookup, when getAdminUserData completes, then an audit_logs row is inserted with event_type='admin_user_lookup' and metadata.target_user_id set.

**AC5 — reengagement_notifications table:** Given the migration is applied, when the table exists, then it has columns (id, user_id, sent_at, email_status, created_at) with a composite index on (user_id, sent_at DESC) and RLS enabled.

**AC6 — No internal HTTP fetch:** Given the RSC page at /admin/users, when it fetches user data, then it calls getAdminUserData() directly (no self-fetch).

## Tasks / Subtasks

- [x] **Task 1 — Migration: reengagement_notifications table** (AC: #5)
  - [x] Create `supabase/migrations/014_reengagement_notifications.sql`
  - [x] Table with id, user_id FK, sent_at, email_status check, created_at
  - [x] Composite index on (user_id, sent_at DESC)
  - [x] RLS enabled, grant select/insert/update/delete to service_role (P2 patch)

- [x] **Task 2 — Validation schema** (AC: #2)
  - [x] Create `lib/validation/admin.ts` with AdminUserLookupSchema (z.string().uuid())

- [x] **Task 3 — getAdminUserData shared function** (AC: #1, #3, #4, #6)
  - [x] Create `lib/admin/getUserData.ts`
  - [x] Validate UUID (AC2), getUserById (P4: distinguish auth error from not-found), parallel queries, audit log (P3), return typed result

- [x] **Task 4 — API route** (AC: #1–#4)
  - [x] Create `app/api/admin/users/route.ts`
  - [x] P5: UUID validation BEFORE role DB query
  - [x] P4: distinguish 502 AUTH_ERROR from 404 NOT_FOUND
  - [x] P1: check all three DB query errors (briefings, reengagements, profiles)

- [x] **Task 5 — Admin users page RSC** (AC: #1, #6)
  - [x] Create `app/admin/users/page.tsx`
  - [x] P3: pass adminUser.id to getAdminUserData for audit log
  - [x] P6: fixed locale (en-US, UTC) for sent_at to prevent hydration mismatch

- [x] **Task 6 — Loading skeleton** (AC: #1)
  - [x] Create `app/admin/users/loading.tsx`

- [x] **Task 7 — Tests**
  - [x] Create `lib/validation/__tests__/admin.test.ts` — 5 tests
  - [x] Create `app/api/admin/__tests__/users.test.ts` — 17 tests
  - [x] Run full test suite — all pass

## Review Findings (Applied)

- [x] **P1** [High] Silent error swallowing — only briefingsResult.error was checked; fixed to check all three (briefings, reengagement, profiles) in both route.ts and getUserData.ts
- [x] **P2** [High] service_role SELECT-only grant on reengagement_notifications — fixed migration to grant select, insert, update, delete
- [x] **P3** [Med] Audit log missing on UI path — getAdminUserData now accepts optional adminUserId; page passes adminUser.id
- [x] **P4** [Med] Auth errors returning 404 — separated authUserError (→ 502 AUTH_ERROR) from null user (→ 404 NOT_FOUND)
- [x] **P5** [Med] UUID validation after role DB query — moved safeParse before adminClient.from("profiles") in route.ts
- [x] **P6** [Low] toLocaleString() hydration mismatch — fixed to toLocaleString("en-US", { timeZone: "UTC" })

## Dev Agent Record

### Completion Notes

All ACs implemented with all 6 code review patches applied. 5 validation tests + 17 users route tests. 422 baseline → 445 tests passing.

### File List

- `supabase/migrations/014_reengagement_notifications.sql` (new)
- `lib/validation/admin.ts` (new)
- `lib/admin/getUserData.ts` (new)
- `app/api/admin/users/route.ts` (new)
- `app/admin/users/page.tsx` (new)
- `app/admin/users/loading.tsx` (new)
- `lib/validation/__tests__/admin.test.ts` (new)
- `app/api/admin/__tests__/users.test.ts` (new)

### Change Log

- Story 7.2 implemented with all 6 review patches applied (2026-06-13)
