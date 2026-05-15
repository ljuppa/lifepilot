# Story 5.1: Goal Progress & Check-In Streak

Status: review

## Story

As a signed-in user,
I want to see my progress toward each active goal and my current check-in streak on the goals page,
So that I can stay motivated and track consistency at a glance.

## Acceptance Criteria

**AC1 — Auth middleware:** Given any request to a protected `(app)` route, when the middleware runs, then the Supabase session cookie is refreshed (preventing silent expiry) and unauthenticated requests are redirected to `/sign-in` without hitting page RSCs.

**AC2 — Error boundaries:** Given any `(app)` route RSC throws an unhandled error, when Next.js catches it, then a branded `error.tsx` error boundary renders (not the default Next.js error page); the boundary has a "Try again" refresh button; routes with existing `loading.tsx` get a matching `error.tsx`.

**AC3 — Streak badge:** Given I navigate to `/goals`, when the page loads, then a `StreakBadge` displays at the top showing flame icon (Lucide `Flame`, 16px, amber) + streak count + "day streak" label; if streak = 0 the badge reads "Start your streak" (greyed); milestones 7/30/100 trigger a brief `animate-pulse` once on mount (respects `prefers-reduced-motion`).

**AC4 — Goal progress bars:** Given I have active goals, when the goals page loads, then each goal card shows a progress bar (0–100%) and a progress label; domain-specific logic applies:
- **Health** (`health_metric`): most recent check-in `health_metric` vs `goals.target_value` (% of target reached)
- **Finance** (`finance_metric`): sum of `finance_metric` values this calendar month vs `goals.target_value` (% of budget used — inverted: 100% = on budget, >100% = over)
- **Wellness** (`wellness_metric`): 7-day rolling average of `wellness_metric` vs `goals.target_value` (% of target reached)
- If `target_value` is null or no check-ins exist, show "No data yet" instead of a bar.

**AC5 — Progress API:** Given an authenticated request to `GET /api/goals/[id]/progress`, when the handler runs, then it returns `{ streakDays, progressPercent, progressLabel, currentValue }` for the specified goal; unauthenticated returns 401; goal belonging to another user returns 404.

**AC6 — Zero/empty states:** Given I have no goals, when the goals page loads, then the streak badge still appears (streak can exist independent of goals); given I have goals but no check-ins, each goal shows "No data yet" progress state.

## Tasks / Subtasks

- [x] **Task 0 — Architectural foundation** (AC: #1, #2)
  - [x] Create `utils/supabase/middleware.ts` — exports `updateSession(request)` that refreshes the Supabase session cookie using `@supabase/ssr` `createServerClient` with request/response cookie read/write
  - [x] Create `middleware.ts` at project root — calls `updateSession`; matcher covers all `(app)` routes: `/dashboard`, `/briefing`, `/checkin`, `/goals`, `/onboarding`, `/profile`, `/settings`; redirect unauthenticated to `/sign-in`
  - [x] Create `app/(app)/error.tsx` — shared error boundary for all `(app)` routes: `"use client"`, props `{ error: Error; reset: () => void }`, renders `CoachVoiceLine variant="error"` + "Try again" Button calling `reset()`; max-w-[680px] layout matching other pages
  - [x] Create co-located `error.tsx` in: `app/(app)/dashboard/`, `app/(app)/briefing/`, `app/(app)/briefing/[id]/`, `app/(app)/goals/` — each re-exports the shared error boundary from `app/(app)/error.tsx`
  - [x] Write tests for middleware session refresh logic in `middleware.test.ts`

- [x] **Task 1 — `GET /api/goals/[id]/progress` endpoint** (AC: #5)
  - [x] Create `app/api/goals/[id]/progress/route.ts`
  - [x] Auth guard: 401 if no session; 404 if goal not found or belongs to other user
  - [x] Streak computation: query `checkins` for this user, ordered by `checked_in_at DESC`; compute consecutive calendar days ending today (in UTC); if no check-in today yet, include yesterday's streak (streak not broken until tomorrow); return `streakDays: number`
  - [x] Domain progress (check `goal.domain`):
    - `health`: `SELECT health_metric FROM checkins WHERE user_id=$1 ORDER BY checked_in_at DESC LIMIT 1` → `currentValue / target_value * 100`
    - `finance`: `SELECT SUM(finance_metric) FROM checkins WHERE user_id=$1 AND checked_in_at >= date_trunc('month', NOW())` → `SUM / target_value * 100` (capped at display max 150%)
    - `wellness`: `SELECT AVG(wellness_metric) FROM checkins WHERE user_id=$1 AND checked_in_at >= NOW() - INTERVAL '7 days'` → `AVG / target_value * 100`
  - [x] If `target_value IS NULL` or metric query returns null: `progressPercent: null, progressLabel: "No data yet", currentValue: null`
  - [x] Otherwise: `progressPercent: number (0–150), progressLabel: string (e.g. "6.2 hrs avg", "$1,240 / $2,000"), currentValue: number`
  - [x] Create `app/api/goals/[id]/__tests__/progress.test.ts` with ≥ 8 tests

- [x] **Task 2 — `StreakBadge` component** (AC: #3)
  - [x] Create `components/goals/StreakBadge.tsx` — `"use client"` (needs `useEffect` for milestone pulse)
  - [x] Props: `{ streakDays: number }`
  - [x] Renders: `bg-amber-50 border border-amber-200 rounded-full px-3 py-1 flex items-center gap-1.5`; `Flame` icon 16px `text-amber-500`; streak count `font-semibold`; "day streak" label `text-muted-foreground text-sm`
  - [x] Zero state: when `streakDays === 0`, render greyed variant: `bg-muted border-border text-muted-foreground`, no flame fill, text "Start your streak"
  - [x] Milestone animation: on mount, if `streakDays` is 7, 30, or 100, add `animate-pulse` class for 1.5s then remove; check `window.matchMedia("(prefers-reduced-motion: reduce)")` and skip if true
  - [x] Create `components/goals/__tests__/StreakBadge.test.tsx` with ≥ 6 tests

- [x] **Task 3 — `GoalProgressBar` component** (AC: #4)
  - [x] Create `components/goals/GoalProgressBar.tsx` — pure presentational, no `"use client"` needed
  - [x] Props: `{ progressPercent: number | null; progressLabel: string | null }`
  - [x] When `progressPercent === null`: render `<p className="text-sm text-muted-foreground">No data yet</p>`
  - [x] Otherwise: render `<div>` with label text above + progress bar: outer `bg-muted rounded-full h-2`, inner `bg-primary rounded-full h-2` with `width: Math.min(progressPercent, 100)%` (cap at 100% visually)
  - [x] Finance domain inverted label: the parent passes the label string, component just displays it
  - [x] Create `components/goals/__tests__/GoalProgressBar.test.tsx` with ≥ 5 tests

- [x] **Task 4 — Update goals page** (AC: #3, #4, #6)
  - [x] The existing `/goals` page is a client component — keep it as `"use client"` for form interactions
  - [x] Add parallel `fetch("/api/goals/[id]/progress")` calls for each active goal after goals load; use `Promise.all` to fetch progress for all goals simultaneously
  - [x] Extract `streakDays` from the first goal's progress response (or default 0 if no goals); render `<StreakBadge streakDays={streakDays} />` above the goal list
  - [x] Each goal card shows `<GoalProgressBar progressPercent={...} progressLabel={...} />` below the goal title
  - [x] During progress loading: show `GoalProgressBar` with `progressPercent={null} progressLabel={null}` (renders "No data yet" as placeholder — avoids separate skeleton)
  - [x] Update `app/(app)/goals/page.tsx` tests to cover streak + progress rendering

## Dev Notes

### Task 0: Middleware Pattern

The `@supabase/ssr` package supports middleware session refresh. Pattern from Supabase docs:

```ts
// utils/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = [
    "/dashboard", "/briefing", "/checkin", "/goals", "/onboarding", "/profile", "/settings"
  ].some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

```ts
// middleware.ts (project root)
import { updateSession } from "@/utils/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

### Task 0: Error Boundary Pattern

The shared error boundary at `app/(app)/error.tsx`:
```tsx
"use client";
import { Button } from "@/components/ui/button";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-4">
      <CoachVoiceLine variant="empty">
        Something went wrong. Please try again.
      </CoachVoiceLine>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
```

Per Next.js App Router: each segment needs its own `error.tsx`. Co-located `error.tsx` files in `dashboard/`, `briefing/`, `briefing/[id]/`, `goals/` should re-export the shared component:
```tsx
// app/(app)/dashboard/error.tsx
export { default } from "@/app/(app)/error";
```

### Task 1: Streak Computation Algorithm

```ts
function computeStreak(checkins: { checked_in_at: string }[], nowUtc: Date): number {
  if (checkins.length === 0) return 0;

  // Normalize to calendar dates in UTC
  const checkinDates = new Set(
    checkins.map((c) => c.checked_in_at.slice(0, 10)) // "YYYY-MM-DD"
  );

  const today = nowUtc.toISOString().slice(0, 10);
  const hasToday = checkinDates.has(today);

  let streak = 0;
  let cursor = new Date(nowUtc);

  // If no check-in today, start counting from yesterday
  if (!hasToday) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!checkinDates.has(dateStr)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
```

### Task 1: Progress API Response Shape

```ts
interface ProgressResponse {
  streakDays: number;
  progressPercent: number | null;  // 0–150, null if no data
  progressLabel: string | null;    // "6.2 hrs avg", "$1,240 / $2,000", "68 / 70 kg"
  currentValue: number | null;
}
```

### Task 2: StreakBadge Milestone Animation

```tsx
useEffect(() => {
  const MILESTONES = [7, 30, 100];
  if (!MILESTONES.includes(streakDays)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  setPulse(true);
  const t = setTimeout(() => setPulse(false), 1500);
  return () => clearTimeout(t);
}, [streakDays]);
```

### Task 4: Goals Page Progress Fetch Pattern

The goals page already fetches goals in `useEffect`. After goals load, fire parallel progress requests:

```ts
const progressResults = await Promise.all(
  goals.map((g) => fetch(`/api/goals/${g.id}/progress`).then((r) => r.json()))
);
// progressResults[i] matches goals[i]
const progressMap = Object.fromEntries(goals.map((g, i) => [g.id, progressResults[i]?.data]));
const firstProgress = progressResults[0]?.data;
setStreakDays(firstProgress?.streakDays ?? 0);
setProgressMap(progressMap);
```

### Existing Files to Modify

- `app/(app)/goals/page.tsx` — add StreakBadge + GoalProgressBar rendering, progress fetch
- No changes to API routes in `app/api/goals/` or `app/api/goals/[id]/route.ts`

### Existing Patterns to Follow

- API auth guard: same pattern as `app/api/goals/route.ts` (check `authError || !user`)
- Response shape: `{ data: { ... } }` on success, `{ error: { code, message } }` on error  
- Zod validation not needed for this GET endpoint (no body)
- Testing: mock `@/utils/supabase/server` with `vi.mock()`, same as existing API tests

### Files to CREATE

```
utils/supabase/middleware.ts
middleware.ts
app/(app)/error.tsx
app/(app)/dashboard/error.tsx
app/(app)/briefing/error.tsx
app/(app)/briefing/[id]/error.tsx
app/(app)/goals/error.tsx
app/api/goals/[id]/progress/route.ts
app/api/goals/[id]/__tests__/progress.test.ts
components/goals/StreakBadge.tsx
components/goals/__tests__/StreakBadge.test.tsx
components/goals/GoalProgressBar.tsx
components/goals/__tests__/GoalProgressBar.test.tsx
```

### Files to MODIFY

```
app/(app)/goals/page.tsx  — add StreakBadge, GoalProgressBar, progress fetch
```

### Files NOT to touch

```
app/api/goals/route.ts
app/api/goals/[id]/route.ts
utils/supabase/server.ts
utils/supabase/client.ts
components/ui/domain-chip.tsx
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(empty)

### Completion Notes List

- All 5 tasks complete. 310 tests passing (34 new).
- `middleware.ts` + `utils/supabase/middleware.ts`: Supabase SSR session refresh at the edge; redirects unauthenticated to `/sign-in` for all protected routes; 10 tests.
- `app/(app)/error.tsx`: shared error boundary re-exported to dashboard, briefing, briefing/[id], goals.
- `GET /api/goals/[id]/progress`: streak via consecutive-day algorithm (not broken until tomorrow if no check-in today); domain-specific progress (health=latest metric, finance=month sum, wellness=7d avg); 11 tests.
- `StreakBadge`: milestone pulse (7/30/100 days), respects `prefers-reduced-motion`, zero state; 6 tests.
- `GoalProgressBar`: null → "No data yet", aria-progressbar, visual fill capped at 100%; 6 tests.
- Goals page: parallel `Promise.all` progress fetch, StreakBadge in header, GoalProgressBar per card.

### File List

- `utils/supabase/middleware.ts` — new
- `middleware.ts` — new
- `middleware.test.ts` — new (10 tests)
- `app/(app)/error.tsx` — new (shared error boundary)
- `app/(app)/dashboard/error.tsx` — new
- `app/(app)/briefing/error.tsx` — new
- `app/(app)/briefing/[id]/error.tsx` — new
- `app/(app)/goals/error.tsx` — new
- `app/api/goals/[id]/progress/route.ts` — new
- `app/api/goals/[id]/__tests__/progress.test.ts` — new (11 tests)
- `components/goals/StreakBadge.tsx` — new
- `components/goals/__tests__/StreakBadge.test.tsx` — new (6 tests)
- `components/goals/GoalProgressBar.tsx` — new
- `components/goals/__tests__/GoalProgressBar.test.tsx` — new (6 tests)
- `app/(app)/goals/page.tsx` — modified
- `app/(app)/__tests__/goals-page.test.tsx` — modified

### Change Log

- 2026-05-15: Story created — Sprint 5, Epic 5 first story; includes architectural improvements (middleware + error boundaries) as Task 0
- 2026-05-15: Implementation complete — 310 tests passing, all ACs satisfied
