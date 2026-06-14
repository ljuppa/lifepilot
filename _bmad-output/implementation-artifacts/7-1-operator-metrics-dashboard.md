# Story 7.1: Operator Metrics Dashboard

Status: done

## Story

As a platform operator,
I want a password-protected admin dashboard at /admin showing today's DAU, briefing delivery rate, check-in rate, and total users,
So that I can monitor platform health without querying the database directly.

## Acceptance Criteria

**AC1 — Auth guard:** Given any unauthenticated request to /admin/*, when the middleware runs, then the request is redirected to /sign-in.

**AC2 — Role guard:** Given an authenticated user without admin role visits /admin, when the layout renders, then they are redirected to /dashboard.

**AC3 — Metrics display:** Given an authenticated admin visits /admin, when the page loads, then four stat cards show: DAU (today), Briefing Delivery Rate (today, integer %), Check-in Rate (today, integer %), Total Users.

**AC4 — DAU correctness:** Given the DAU query, when it runs, then it uses COUNT(DISTINCT user_id) via a Postgres RPC to avoid PostgREST's 1k row limit.

**AC5 — API endpoint:** Given GET /api/admin/metrics, when called by an authenticated admin, then it returns { data: { dau, briefingDeliveryRate, checkinRate, totalUsers } } with status 200; non-admins get 403; unauthenticated gets 401.

**AC6 — No internal HTTP fetch:** Given the RSC page at /admin, when it fetches metrics, then it calls getAdminMetrics() directly (no self-fetch to /api/admin/metrics).

## Tasks / Subtasks

- [x] **Task 1 — Middleware: add /admin to PROTECTED_ROUTES** (AC: #1)
  - [x] Edit `middleware.ts` (proxy.ts) — add "/admin" to PROTECTED_ROUTES array

- [x] **Task 2 — Migration: admin role column** (AC: #2)
  - [x] Create `supabase/migrations/012_add_admin_role.sql`
  - [x] Add `role text not null default 'user' check (role in ('user', 'admin'))` to profiles

- [x] **Task 3 — Migration: get_dau RPC** (AC: #4)
  - [x] Create `supabase/migrations/013_admin_metrics_rpc.sql`
  - [x] Implement `get_dau(today_start timestamptz)` as security definer RPC

- [x] **Task 4 — getAdminMetrics shared function** (AC: #5, #6)
  - [x] Create `lib/admin/getMetrics.ts`
  - [x] Implement DAU via rpc("get_dau"), totalUsers, briefingDeliveryRate, checkinRate
  - [x] Use service-role client (bypasses RLS)

- [x] **Task 5 — API route** (AC: #5)
  - [x] Create `app/api/admin/metrics/route.ts`
  - [x] Env var check → auth check → role check → delegate to getAdminMetrics()

- [x] **Task 6 — Admin layout with role guard** (AC: #2)
  - [x] Create `app/admin/layout.tsx`
  - [x] Check profiles.role, redirect non-admins to /dashboard

- [x] **Task 7 — Admin page RSC** (AC: #3, #6)
  - [x] Create `app/admin/page.tsx`
  - [x] Call getAdminMetrics() directly, render 4 stat cards

- [x] **Task 8 — Loading skeleton** (AC: #3)
  - [x] Create `app/admin/loading.tsx`

- [x] **Task 9 — Tests** (AC: #1–#6)
  - [x] Create `app/api/admin/__tests__/metrics.test.ts` — 13 tests
  - [x] Run full test suite — all pass

## Dev Agent Record

### Completion Notes

All ACs implemented. 13 tests cover: config error, 401, 403, 200 data shape, DAU via RPC, DB error, briefingDeliveryRate (integer, zero case, clamped to 100), checkinRate (zero case, percentage), totalUsers, structured log, no PII in log. 409 baseline → 422 tests passing.

### File List

- `middleware.ts` (modified)
- `supabase/migrations/012_add_admin_role.sql` (new)
- `supabase/migrations/013_admin_metrics_rpc.sql` (new)
- `lib/admin/getMetrics.ts` (new)
- `app/api/admin/metrics/route.ts` (new)
- `app/admin/layout.tsx` (new)
- `app/admin/page.tsx` (new)
- `app/admin/loading.tsx` (new)
- `app/api/admin/__tests__/metrics.test.ts` (new)

### Change Log

- Story 7.1 implemented: admin role column, get_dau RPC, metrics API, dashboard RSC, 13 tests (2026-06-13)
