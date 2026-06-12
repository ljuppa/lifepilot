# Story 6.3: Automated Data Retention

Status: ready-for-dev

## Story

As a platform operator subject to GDPR data minimisation requirements,
I want check-in data older than 12 months and briefings older than 6 months deleted automatically,
So that the platform complies with GDPR Art. 5(1)(e) without manual intervention.

## Acceptance Criteria

**AC1 — Inngest scheduled function:** Given the `retentionCleanup` Inngest scheduled job is registered at `POST /api/inngest`, when it runs nightly at 02:00 UTC, then it deletes all `checkins` rows where `checked_in_at < (now − 12 months)` across all users, then deletes all `briefings` rows where `briefing_date < (now − 6 months)` across all users; the two deletions are separate DB operations (not a single transaction).

**AC2 — Service-role client:** Given the job uses a Supabase service role client, when it performs deletions, then it bypasses RLS (service role) to operate across all users; no user session is required; the service role key is stored in Vercel environment variables only.

**AC3 — Structured logging:** Given the job completes, when it logs its result, then structured JSON contains `{ event: 'retention_cleanup_complete', checkinsDeleted: N, briefingsDeleted: N, ranAt: ISO }` — no user IDs or content in log fields.

**AC4 — Retry behaviour:** Given the Inngest function fails, when the failure occurs, then Inngest retries up to 3 times; failure is visible in the Inngest dashboard; no partial deletion state is left inconsistent (each deletion is idempotent).

**AC5 — Retention indexes:** Given the migration for retention indexes is applied, when the DELETE queries run, then an index on `checkins(checked_in_at)` and an index on `briefings(briefing_date)` exist to prevent full table scans.

## Tasks / Subtasks

- [ ] **Task 1 — Migration: add `idx_checkins_checked_in_at` index** (AC: #5)
  - [ ] Create `supabase/migrations/010_retention_indexes.sql`
  - [ ] Add `CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at ON public.checkins (checked_in_at);`
  - [ ] Do NOT add `idx_briefings_briefing_date` — it already exists in `006_briefings.sql`
  - [ ] Verify migration file name is the next in sequence (010_)

- [ ] **Task 2 — Tests for `retentionCleanup`** (AC: #1–#4)
  - [ ] Create `lib/inngest/__tests__/retentionCleanup.test.ts`
  - [ ] Test: `delete-stale-data` step calls checkins delete with correct cutoff (`< twelveMonthsAgo`)
  - [ ] Test: `delete-stale-data` step calls briefings delete with correct cutoff (`< sixMonthsAgo` date string)
  - [ ] Test: both deletes run in the same step (inside `step.run("delete-stale-data", ...)`)
  - [ ] Test: function returns `{ checkinsDeleted, briefingsDeleted, ranAt }` with correct counts
  - [ ] Test: structured log `{ event: "retention_cleanup_complete", checkinsDeleted, briefingsDeleted, ranAt }` is emitted
  - [ ] Test: no user IDs or personal data appear in log output
  - [ ] Test: service-role client used (not SSR session client) — verify `SUPABASE_SERVICE_ROLE_KEY` env var consumed
  - [ ] Run full test suite to confirm no regressions

## Dev Notes

### CRITICAL: `retentionCleanup` function is already fully implemented — do NOT rewrite it

`lib/inngest/functions/retentionCleanup.ts` is complete and registered. AC1–AC4 are already satisfied by existing code. This story's implementation work is:

1. **One missing index** (AC5 partial gap): `idx_checkins_checked_in_at` is absent from migrations. `idx_briefings_briefing_date` already exists in `006_briefings.sql` — only the checkins index is missing.
2. **Missing tests**: `lib/inngest/__tests__/retentionCleanup.test.ts` does not exist.

### Existing implementation — retentionCleanup.ts

```ts
// lib/inngest/functions/retentionCleanup.ts (ALREADY EXISTS — do NOT modify)
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { inngest } from "../client";

export const retentionCleanup = inngest.createFunction(
  { id: "retention-cleanup", retries: 3, triggers: [{ cron: "0 2 * * *" }] },
  async ({ step }) => {
    const ranAt = new Date().toISOString();

    const { checkinsDeleted, briefingsDeleted } = await step.run("delete-stale-data", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [checkinsRes, briefingsRes] = await Promise.all([
        adminClient.from("checkins").delete().lt("checked_in_at", twelveMonthsAgo.toISOString()).select("id"),
        adminClient.from("briefings").delete().lt("briefing_date", sixMonthsAgo.toISOString().split("T")[0]).select("id"),
      ]);

      return {
        checkinsDeleted: checkinsRes.data?.length ?? 0,
        briefingsDeleted: briefingsRes.data?.length ?? 0,
      };
    });

    console.log(JSON.stringify({ event: "retention_cleanup_complete", checkinsDeleted, briefingsDeleted, ranAt }));
    return { checkinsDeleted, briefingsDeleted, ranAt };
  }
);
```

The function is registered in `app/api/inngest/route.ts` alongside `generateBriefing`, `checkInactivity`, and `exportUserData`.

### Existing indexes — what already exists vs. what's missing

From `supabase/migrations/004_checkins.sql`:
```sql
create index idx_checkins_user_id       on public.checkins (user_id);
create index idx_checkins_user_id_date  on public.checkins (user_id, checked_in_at desc);
-- ❌ NO standalone idx_checkins_checked_in_at
```

From `supabase/migrations/006_briefings.sql`:
```sql
-- ✅ Already exists
create index idx_briefings_briefing_date on public.briefings (briefing_date);
```

The `idx_checkins_user_id_date` composite index will NOT be used efficiently for the retention DELETE query which filters only by `checked_in_at` across all users (no `user_id` filter). A standalone `idx_checkins_checked_in_at` is required.

### Migration file for Task 1

```sql
-- supabase/migrations/010_retention_indexes.sql
-- Standalone index on checked_in_at for efficient cross-user retention cleanup.
-- idx_checkins_user_id_date is not used by retention queries (no user_id predicate).
create index if not exists idx_checkins_checked_in_at
  on public.checkins (checked_in_at);
```

### Test pattern for Inngest functions

Follow the pattern used in `lib/inngest/__tests__/exportUserData.test.ts`. Key points:
- Mock `@supabase/supabase-js` to intercept the service-role client creation
- Mock `console.log` with `vi.spyOn` to verify structured log output
- Use a mock step runner that executes `step.run(id, fn)` callbacks immediately (sync executor)
- The delete queries return `{ data: [{ id: "..." }, ...], error: null }` — `data.length` is what counts

**Mock structure for delete queries:**

```ts
const mockDeleteQuery = (rowCount: number) => {
  const rows = Array.from({ length: rowCount }, (_, i) => ({ id: `id-${i}` }));
  const selectMock = vi.fn().mockResolvedValue({ data: rows, error: null });
  const ltMock = vi.fn().mockReturnValue({ select: selectMock });
  const deleteMock = vi.fn().mockReturnValue({ lt: ltMock });
  return { delete: deleteMock };
};
```

**Mock step runner pattern (from exportUserData tests):**

```ts
const mockStep = {
  run: vi.fn().mockImplementation((_id: string, fn: () => unknown) => fn()),
};
```

**Verifying the cutoff dates:**

The function uses `new Date()` internally. To test cutoffs precisely, either:
- Use `vi.useFakeTimers()` and set a fixed date before calling the function, OR
- Capture the `.lt()` argument and assert it's a valid ISO string that is approximately 12/6 months before `Date.now()`

Recommended: use `vi.useFakeTimers()` with a fixed date for deterministic assertions.

```ts
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-06-01T00:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

// Then in test:
// twelveMonthsAgo = "2024-06-01T00:00:00.000Z"
// sixMonthsAgo date = "2024-12-01"
```

### Test file location and import

```
lib/inngest/__tests__/retentionCleanup.test.ts
```

Import the function under test:
```ts
import { retentionCleanup } from "../functions/retentionCleanup";
```

The Inngest client must be mocked to allow function invocation in tests. Follow the same `vi.mock("../client", ...)` approach used in `exportUserData.test.ts`.

### No changes needed to route.ts

`app/api/inngest/route.ts` already imports and registers `retentionCleanup`. Do not touch it.

## Dev Agent Record

### Debug Log

_(empty)_

### Completion Notes

_(empty)_

## File List

_(to be filled during implementation)_

## Change Log

| Date       | Change                                      |
|------------|---------------------------------------------|
| 2026-06-12 | Story created (ready-for-dev)               |
