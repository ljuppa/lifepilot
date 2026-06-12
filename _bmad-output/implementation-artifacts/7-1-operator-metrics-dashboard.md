# Story 7.1: Operator Metrics Dashboard

Status: ready-for-dev

## Story

As a platform operator,
I want to view aggregate platform health metrics (DAU, briefing delivery rate, check-in rate) without accessing individual user data,
So that I can monitor the health and growth of the platform.

## Acceptance Criteria

**AC1 — Admin route guard:** Given I navigate to `/admin`, when `app/admin/layout.tsx` runs, then it verifies `user.role === 'admin'` (from the `profiles.role` column) after the session check; unauthenticated users are redirected to `/sign-in`; authenticated non-admin users are redirected to `/dashboard`; the admin role check is a separate guard from regular auth middleware.

**AC2 — Metrics API:** Given I am an authenticated admin on `/admin`, when `GET /api/admin/metrics` runs, then it returns aggregate stats computed server-side:
- `dau`: distinct `user_id` count in `checkins` where `checked_in_at >= today 00:00:00 UTC`
- `briefingDeliveryRate`: delivered briefings today ÷ total briefings today × 100 (integer 0–100; 0 when no briefings today)
- `checkinRate`: DAU ÷ total users × 100 (integer 0–100; 0 when no users)
- `totalUsers`: total row count in `profiles`

Response shape: `{ data: { dau, briefingDeliveryRate, checkinRate, totalUsers } }`

**AC3 — Admin role guard in API:** Given `GET /api/admin/metrics` is called, when the Route Handler runs, then admin role (`profiles.role === 'admin'`) is verified at the top before any DB query; unauthenticated returns 401; non-admin returns 403.

**AC4 — No PII on admin pages:** Stats are displayed as simple stat cards (number + label); no user-identifying information appears on any admin page; no names, emails, health data, financial data, or goal details are present anywhere in the response.

**AC5 — Skeleton loading:** Given the metrics are loading, when data is in flight (page navigation), then skeleton stat cards are shown via `app/admin/loading.tsx`; data refreshes on page reload (no real-time polling in MVP).

**AC6 — Middleware protection:** Given any request to `/admin/*`, when the middleware runs, then `proxy.ts` enforces the base session check (same as other protected routes); the admin layout adds the role check on top.

## Tasks / Subtasks

- [ ] **Task 1: Migration 012 — add `role` column to profiles**
  - [ ] Create `supabase/migrations/012_add_admin_role.sql`
  - [ ] `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'))`
  - [ ] Verify migration is idempotent (`IF NOT EXISTS` / `IF NOT EXISTS` guards)

- [ ] **Task 2: Protect `/admin` in middleware**
  - [ ] Add `"/admin"` to `PROTECTED_ROUTES` in `proxy.ts`
  - [ ] Confirm `isProtected()` handles `/admin/users` etc. via `startsWith` (already correct)

- [ ] **Task 3: Admin layout with role guard**
  - [ ] Create `app/admin/layout.tsx`
  - [ ] `createClient()` + `supabase.auth.getUser()` — redirect to `/sign-in` if no user
  - [ ] Query `profiles.role` for `user.id` — redirect to `/dashboard` if role ≠ `'admin'`
  - [ ] Render minimal admin chrome (heading + `{children}`)

- [ ] **Task 4: `GET /api/admin/metrics` route + tests**
  - [ ] Write failing tests first: `app/api/admin/__tests__/metrics.test.ts`
    - [ ] 401 when unauthenticated
    - [ ] 403 when role ≠ admin
    - [ ] 200 with correct `{ data: { dau, briefingDeliveryRate, checkinRate, totalUsers } }` shape
    - [ ] DAU counts distinct user_ids (not total rows)
    - [ ] briefingDeliveryRate is 0 when no briefings today
    - [ ] checkinRate is 0 when totalUsers is 0
    - [ ] structured log emitted on success
  - [ ] Implement `app/api/admin/metrics/route.ts`
  - [ ] Run tests — all pass

- [ ] **Task 5: Admin dashboard page + skeleton**
  - [ ] Create `app/admin/loading.tsx` — 4 skeleton stat card placeholders
  - [ ] Create `app/admin/page.tsx` — async RSC, fetches `GET /api/admin/metrics` server-side via absolute URL, renders 4 `StatCard` components
  - [ ] Define inline `StatCard` component (number + label)

## Dev Notes

### CRITICAL: `role` column does not exist yet — migration 012 must be the first task

The `profiles` table currently has no `role` column. All other tasks depend on this migration existing. The admin layout and metrics API will fail without it. Run `supabase db reset` locally or apply migration manually before testing layout/API.

### CRITICAL: Admin is at `app/admin/` — NOT inside `app/(app)/`

Regular authenticated routes live in `app/(app)/`. Admin routes live in `app/admin/` (a separate route segment, not a route group). This gives admin its own layout and avoids inheriting the app navigation.

```
app/
├── (app)/          ← regular user routes (dashboard, checkin, data, etc.)
│   └── layout.tsx  ← app nav/shell
├── admin/          ← operator routes — completely separate
│   ├── layout.tsx  ← admin role guard + minimal chrome
│   ├── page.tsx    ← metrics dashboard
│   └── loading.tsx ← skeleton cards
└── api/
    └── admin/
        └── metrics/
            └── route.ts
```

### Migration 012 — exact SQL

```sql
-- supabase/migrations/012_add_admin_role.sql
alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin'));
```

No RLS policy needed — users can already read their own profile row (existing `FOR all` policy covers SELECT). The `role` field is readable by the user for their own row, which is what the admin layout needs.

### Admin layout — auth guard pattern

The layout uses `createClient()` (SSR anon-key client with RLS) to check the logged-in user's own `role` field. No service role needed here — the user reads their own profile row.

```tsx
// app/admin/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold mb-8">Admin</h1>
      {children}
    </div>
  );
}
```

### Metrics API — service role client for cross-user queries

The metrics API must query across ALL users (bypassing RLS) to compute aggregate stats. Use the service role client:

```ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

This is the same pattern as `app/api/profile/route.ts` DELETE and the Inngest functions.

### Admin role check in API — use service client to check requester's role

After `supabase.auth.getUser()`, query the `profiles` table via service client to check role:

```ts
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required." } },
      { status: 403 }
    );
  }
  // ... metrics queries
}
```

### Metrics computation — exact implementation

```ts
// All metrics use todayStart (midnight UTC) as the boundary
const todayStart = new Date();
todayStart.setUTCHours(0, 0, 0, 0);
const todayDateStr = todayStart.toISOString().slice(0, 10); // 'YYYY-MM-DD'

// DAU: fetch all user_ids for today's check-ins, count distinct in JS
// (MVP approach; optimise with a DB function if user base grows significantly)
const { data: todayCheckins } = await adminClient
  .from("checkins")
  .select("user_id")
  .gte("checked_in_at", todayStart.toISOString());
const dau = new Set((todayCheckins ?? []).map((r) => r.user_id)).size;

// Total users
const { count: totalUsers } = await adminClient
  .from("profiles")
  .select("*", { count: "exact", head: true });

// Briefing delivery rate (integer %)
const { count: totalBriefings } = await adminClient
  .from("briefings")
  .select("*", { count: "exact", head: true })
  .eq("briefing_date", todayDateStr);

const { count: deliveredBriefings } = await adminClient
  .from("briefings")
  .select("*", { count: "exact", head: true })
  .eq("briefing_date", todayDateStr)
  .eq("email_status", "delivered");

const briefingDeliveryRate =
  (totalBriefings ?? 0) > 0
    ? Math.round(((deliveredBriefings ?? 0) / totalBriefings!) * 100)
    : 0;

// Check-in rate (distinct users who checked in today ÷ total users)
const checkinRate =
  (totalUsers ?? 0) > 0 ? Math.round((dau / totalUsers!) * 100) : 0;

console.log(JSON.stringify({ event: "admin_metrics_fetched", dau, briefingDeliveryRate, checkinRate, totalUsers }));
return NextResponse.json({ data: { dau, briefingDeliveryRate, checkinRate, totalUsers } });
```

### Briefings table schema (confirmed)

```
briefings(
  id UUID,
  user_id UUID,
  content JSONB,
  briefing_date DATE,           ← use for today's date filter
  email_status TEXT             ← 'pending' | 'delivered' | 'failed' | 'skipped_preference'
  safety_filter_triggered BOOL,
  helpful BOOL,
  created_at TIMESTAMPTZ
)
```

Index `idx_briefings_briefing_date` already exists on `briefings(briefing_date)` — the delivery rate queries will be fast.

### Admin page — RSC that fetches from its own API

The admin `page.tsx` calls `GET /api/admin/metrics` using the absolute URL. In RSC, use `process.env.NEXT_PUBLIC_APP_URL` or construct the URL from `headers()`:

```tsx
// app/admin/page.tsx
import { headers } from "next/headers";

export default async function AdminPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocol}://${host}/api/admin/metrics`, {
    headers: { cookie: headersList.get("cookie") ?? "" }, // forward session cookie
    cache: "no-store",
  });
  const json = await res.json();
  const metrics = json.data ?? { dau: 0, briefingDeliveryRate: 0, checkinRate: 0, totalUsers: 0 };
  // ...render StatCards
}
```

Alternatively (simpler, avoids network hop) — call the metrics logic directly as a server function. But for consistency with the AC ("GET /api/admin/metrics") and testability, the fetch approach is the right pattern.

Actually, the cleanest approach for RSC is to extract the metrics logic into a shared function and call it directly from the page, avoiding an internal HTTP round-trip:

```ts
// lib/admin/getMetrics.ts — shared logic
export async function getAdminMetrics() { ... }

// app/api/admin/metrics/route.ts — calls getAdminMetrics()
// app/admin/page.tsx — also calls getAdminMetrics() directly
```

This is the preferred pattern. Use it.

### Skeleton loading — `app/admin/loading.tsx`

Next.js App Router automatically shows `loading.tsx` during navigation while the async server component resolves. It wraps the page in `<Suspense>`:

```tsx
// app/admin/loading.tsx
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold mb-8">Admin</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 animate-pulse">
            <div className="h-8 w-16 bg-muted rounded mb-2" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### StatCard component — define inline in page.tsx

No existing stat card component. Define it inline in `app/admin/page.tsx`:

```tsx
function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
```

Display as:
```tsx
<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
  <StatCard label="DAU" value={metrics.dau} />
  <StatCard label="Briefing delivery rate" value={`${metrics.briefingDeliveryRate}%`} />
  <StatCard label="Check-in rate" value={`${metrics.checkinRate}%`} />
  <StatCard label="Total users" value={metrics.totalUsers ?? 0} />
</div>
```

### Testing patterns for the metrics API

Mock both `@/utils/supabase/server` and `@supabase/supabase-js` using the same pattern as `profile-delete.test.ts`. The metrics endpoint calls `adminClient.from(table).select(...).gte(...)` and `.eq(...)` chains.

The `.head: true` + count pattern returns `{ count: N, data: null }`. For the DAU query, it returns `{ data: [...] }`.

```ts
// Key mocks needed:
// 1. mockGetUser — controls auth state
// 2. mockFrom — controls which table is queried
//    - "profiles" + select("role") → role check
//    - "checkins" + select("user_id") → DAU data
//    - "profiles" + select("*", { count }) → totalUsers count
//    - "briefings" + select("*", { count }) x2 → total/delivered counts

// Pattern for count queries:
const mockHead = vi.fn().mockResolvedValue({ count: 5, error: null });
const mockEqForHead = vi.fn().mockReturnValue({ head: mockHead }); // simplified

// Since mock chains are complex, define per-call return values using mockReturnValueOnce
```

Because the mock chain for the metrics endpoint is complex (many calls to `adminClient.from()`), use a stateful mock approach where each `from(table)` call returns the right mock based on which table is being queried.

### proxy.ts update — exact change

Add `"/admin"` to the `PROTECTED_ROUTES` array:

```ts
const PROTECTED_ROUTES = [
  "/dashboard", "/onboarding", "/checkin", "/goals", "/briefing",
  "/profile", "/settings", "/data", "/admin"  // ← add this
];
```

The existing `isProtected()` uses `startsWith(route + '/')`, so `/admin/users`, `/admin/broadcast` etc. are automatically protected.

### Error response format (established pattern)

All API errors follow:
```json
{ "error": { "code": "UNAUTHORIZED|FORBIDDEN|DB_ERROR", "message": "Human-readable message" } }
```

### Files to CREATE

```
supabase/migrations/012_add_admin_role.sql
app/admin/layout.tsx
app/admin/page.tsx
app/admin/loading.tsx
lib/admin/getMetrics.ts
app/api/admin/metrics/route.ts
app/api/admin/__tests__/metrics.test.ts
```

### Files to MODIFY

```
proxy.ts    ← add "/admin" to PROTECTED_ROUTES
```

### Files NOT to touch

```
app/(app)/                 — user-facing routes, no changes
app/api/profile/route.ts   — no changes needed
utils/supabase/server.ts   — no changes needed
```

### Previous story intelligence (Epic 6)

- **Double-cast for Supabase type mismatches**: `as unknown as Promise<...>` — not needed here (no filter builder issues expected)
- **Service role client pattern**: `createSupabaseClient(URL, SERVICE_ROLE_KEY)` — same as profile DELETE and Inngest functions
- **Error log never includes PII**: no user IDs or content in `console.log`/`console.error` — the metrics log only has aggregate counts
- **Mock chain complexity**: The profile-delete test had issues because `mockFrom` didn't return `update`. For the metrics test, define each `from(table)` call return carefully using `mockReturnValueOnce` in the order the route calls them
- **`!= null` vs falsy checks**: Use `?? 0` for count values (Supabase count can be null)
- **No `pending_deletion` needed** — this is a read-only metrics endpoint with no destructive operations

## Dev Agent Record

### Agent Model Used

(to be filled)

### Debug Log References

(none)

### Completion Notes List

(to be filled)

### File List

(to be filled)

### Change Log

- 2026-06-12: Story created — Sprint 7, Epic 7 Story 1; operator metrics dashboard
