# Story 5.2: Weekly Summary

Status: done

## Story

As a signed-in user,
I want to see a weekly summary of my activity on the goals page,
So that I can understand my consistency and identify trends.

## Acceptance Criteria

**AC1 — Weekly summary section:** Given I navigate to `/goals`, when the page loads, then a "This week" section appears below the goal list showing:
- Days checked in this week (current calendar week, Mon–Sun UTC): e.g. "4 / 7 days"
- Number of briefings received this week
- Per-domain rolling 7-day averages for all active goal domains (health avg, finance avg, wellness avg)
- If fewer than 3 check-ins this week, show a `CoachVoiceLine variant="empty"` nudge: "Check in more often to see your weekly trends."

**AC2 — Weekly summary API:** Given an authenticated request to `GET /api/checkins/summary`, when the handler runs, then it returns:
```ts
{
  daysCheckedInThisWeek: number,       // distinct calendar days with check-ins, Mon–Sun UTC week
  briefingsThisWeek: number,           // briefings where created_at is within current Mon–Sun week
  domainAverages: {
    health: number | null,             // 7-day rolling avg of health_metric (null if no data)
    finance: number | null,            // 7-day rolling avg of finance_metric (null if no data)
    wellness: number | null,           // 7-day rolling avg of wellness_metric (null if no data)
  }
}
```
Unauthenticated → 401. No body parameters needed.

**AC3 — Domain averages filtering:** Given the summary response includes domain averages, when the goals page renders the weekly section, then only domains for which the user has active goals are shown (if the user has only a "health" goal, only the health average is shown).

**AC4 — Loading and empty states:** During summary fetch, the section shows a skeleton. If the user has no check-ins at all this week, show "No check-ins yet this week" CoachVoiceLine instead of averages. The "days checked in" counter still shows (e.g. "0 / 7 days").

## Tasks / Subtasks

- [x] **Task 1 — `GET /api/checkins/summary` endpoint** (AC: #2)
  - [x] Create `app/api/checkins/summary/route.ts`
  - [x] Auth guard: 401 if no session (same pattern as `app/api/goals/route.ts`)
  - [x] Week boundary utility: `getWeekBoundaries(now: Date)` returning `{ weekStart, weekEnd }` as ISO strings (Mon–Sun UTC)
  - [x] Query: distinct check-in calendar days this week (slice `checked_in_at` to `YYYY-MM-DD`, count unique days via `Set`)
  - [x] Query: briefings count this week (`count: "exact"` head query on `briefings` table)
  - [x] Query: 7-day rolling averages per domain (health_metric, finance_metric, wellness_metric) from `checkins` in last 7 days
  - [x] Return shape: `{ data: { daysCheckedInThisWeek, briefingsThisWeek, domainAverages } }`
  - [x] Create `app/api/checkins/__tests__/summary.test.ts` with ≥ 8 tests

- [x] **Task 2 — `WeeklySummary` component** (AC: #1, #3, #4)
  - [x] Create `components/goals/WeeklySummary.tsx`
  - [x] Props: `{ summary: WeeklySummaryData | null; activeDomains: Set<string>; isLoading: boolean }`
  - [x] Loading state: skeleton placeholder divs with `animate-pulse`
  - [x] Zero check-ins (`daysCheckedInThisWeek === 0`): `CoachVoiceLine variant="empty"` "No check-ins yet this week"; days counter still shows "0 / 7 days"
  - [x] Fewer than 3 check-ins: `CoachVoiceLine variant="observation"` nudge — "Check in more often to see your weekly trends."
  - [x] Normal state: days counter + briefings count + per-domain averages filtered by `activeDomains`
  - [x] Create `components/goals/__tests__/WeeklySummary.test.tsx` with ≥ 5 tests

- [x] **Task 3 — Update goals page** (AC: #1, #3, #4)
  - [x] Fetch `/api/checkins/summary` in parallel with goals fetch (add to existing `useEffect` alongside `fetch("/api/goals")`)
  - [x] Add `summary` state (`WeeklySummaryData | null`) and `summaryLoading` state (`boolean`)
  - [x] Derive `activeDomains` as `new Set(goals.map(g => g.domain))` after goals load
  - [x] Render `<WeeklySummary summary={summary} activeDomains={activeDomains} isLoading={summaryLoading} />` below the goal list, above the "Add goal" button
  - [x] Update `app/(app)/__tests__/goals-page.test.tsx` to mock the `/api/checkins/summary` fetch

## Dev Notes

### Existing Code to Extend

- `app/(app)/goals/page.tsx` — already a `"use client"` component with goals state and a progress fetch pattern using `Promise.allSettled`; add summary state, summary fetch (in parallel with goals), and render `<WeeklySummary>` below the goal list.
- `app/api/goals/route.ts` — reference only for auth guard and response shape patterns; do NOT modify.
- New endpoint at `app/api/checkins/summary/route.ts` following the same auth and response conventions.

### Week Boundary Calculation (UTC Monday–Sunday)

```ts
function getWeekBoundaries(now: Date): { weekStart: string; weekEnd: string } {
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return {
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  };
}
```

### API Queries (Task 1)

```ts
// Days checked in this week (distinct calendar days)
const { data: checkinRows } = await supabase
  .from("checkins")
  .select("checked_in_at")
  .eq("user_id", user.id)
  .gte("checked_in_at", weekStart)
  .lte("checked_in_at", weekEnd);
const daysCheckedInThisWeek = new Set(
  checkinRows?.map(r => r.checked_in_at.slice(0, 10))
).size;

// Briefings this week
const { count: briefingsThisWeek } = await supabase
  .from("briefings")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .gte("created_at", weekStart)
  .lte("created_at", weekEnd);

// 7-day rolling domain averages
const sevenDaysAgo = new Date();
sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
const { data: metricRows } = await supabase
  .from("checkins")
  .select("health_metric, finance_metric, wellness_metric")
  .eq("user_id", user.id)
  .gte("checked_in_at", sevenDaysAgo.toISOString());

// Compute averages (null if no rows or all values null for that domain)
function avg(rows: typeof metricRows, key: keyof typeof rows[0]): number | null {
  const values = rows?.map(r => r[key]).filter(v => v !== null) as number[];
  if (!values || values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
```

### Goals Page Addition (Task 3)

Fetch `/api/checkins/summary` in parallel with the goals fetch — use `Promise.allSettled` to prevent one failure from blocking the other. The component receives the `summary` state and `activeDomains` derived from loaded goals.

```ts
// In the existing useEffect, add a parallel summary fetch:
const [goalsResult, summaryResult] = await Promise.allSettled([
  fetch("/api/goals").then(r => r.json()),
  fetch("/api/checkins/summary").then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
]);

// Goals from first result
const loadedGoals = goalsResult.status === "fulfilled" ? (goalsResult.value.data ?? []) : [];
setGoals(loadedGoals);
setIsLoading(false);

// Summary from second result
if (summaryResult.status === "fulfilled") {
  setSummary(summaryResult.value.data ?? null);
}
setSummaryLoading(false);
```

Domain filtering — derive from `goals` after load:
```tsx
// Derive active domains from goals list
const activeDomains = new Set(goals.map(g => g.domain));

// Render per active domain only (inside WeeklySummary):
{activeDomains.has("health") && summary.domainAverages.health !== null && (
  <p>Health avg: {summary.domainAverages.health.toFixed(1)}</p>
)}
```

Render placement — `<WeeklySummary>` goes below the goal list (`</ul>` / empty state) and above the "Add goal" button:
```tsx
{/* Weekly summary — shown once goals have loaded, regardless of count */}
{!isLoading && (
  <WeeklySummary
    summary={summary}
    activeDomains={activeDomains}
    isLoading={summaryLoading}
  />
)}
```

### Auth Guard Pattern (Task 1)

Follow the identical pattern used in `app/api/goals/route.ts`:
```ts
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
    { status: 401 }
  );
}
```

### Response Shape Convention

Success: `{ data: { ... } }`
Error: `{ error: { code: string, message: string } }`

### Test Patterns

- Mock `@/utils/supabase/server` with `vi.mock()` same pattern as `app/api/goals/[id]/__tests__/progress.test.ts`.
- Goals page tests: add `mockResolvedValueOnce` for `fetch("/api/checkins/summary")`.
- Required test cases for `summary.test.ts` (≥ 8):
  1. Returns 401 if unauthenticated
  2. Returns correct `daysCheckedInThisWeek` for multiple check-ins on same day (deduplication)
  3. Returns correct `daysCheckedInThisWeek` across multiple distinct days
  4. Returns correct `briefingsThisWeek` count
  5. Returns `briefingsThisWeek: 0` if no briefings
  6. Returns correct domain averages when check-in data exists
  7. Returns `null` domain averages when no check-ins in last 7 days
  8. Handles Sunday → Monday week boundary correctly (Sunday is end of week, not start)
- Required test cases for `WeeklySummary.test.tsx` (≥ 5):
  1. Shows skeleton when `isLoading` is true
  2. Shows "No check-ins yet this week" CoachVoiceLine when `daysCheckedInThisWeek === 0`
  3. Shows nudge CoachVoiceLine when check-ins < 3
  4. Shows days counter and briefings count in normal state
  5. Shows only domain averages for `activeDomains` (filters out domains not in the set)

### Files to CREATE

```
app/api/checkins/summary/route.ts
app/api/checkins/__tests__/summary.test.ts   (≥ 8 tests)
components/goals/WeeklySummary.tsx
components/goals/__tests__/WeeklySummary.test.tsx  (≥ 5 tests)
```

### Files to MODIFY

```
app/(app)/goals/page.tsx                    — add WeeklySummary component and summary fetch
app/(app)/__tests__/goals-page.test.tsx     — update mocks for /api/checkins/summary fetch
```

### Files NOT to Touch

```
app/api/goals/route.ts
app/api/goals/[id]/route.ts
app/api/goals/[id]/progress/route.ts
utils/supabase/server.ts
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(empty)

### Completion Notes List

- All 3 tasks complete. 330 tests passing (18 new).
- `GET /api/checkins/summary`: Mon–Sun UTC week boundaries, distinct-day deduplication via Set, briefings head count, 7-day domain averages with null filtering; 10 tests.
- `WeeklySummary`: skeleton, zero/nudge/normal states, domain filtering by activeDomains; 6 tests.
- Goals page: parallel `Promise.allSettled([goals, summary])` fetch, `summaryLoading` state, `WeeklySummary` rendered below goal list.
- Goals page tests updated with URL-aware mock implementation to differentiate goals vs summary responses.

### File List

- `app/api/checkins/summary/route.ts` — new
- `app/api/checkins/__tests__/summary.test.ts` — new (10 tests)
- `components/goals/WeeklySummary.tsx` — new
- `components/goals/__tests__/WeeklySummary.test.tsx` — new (6 tests)
- `app/(app)/goals/page.tsx` — modified
- `app/(app)/__tests__/goals-page.test.tsx` — modified

### Change Log

- 2026-05-15: Story created — Sprint 5, Epic 5, Story 5.2; follows patterns established in Story 5.1
- 2026-05-15: Implementation complete — 330 tests passing, all ACs satisfied
