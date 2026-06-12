# Story 7.2: Per-User Email Delivery Lookup

Status: review

## Story

As a platform operator,
I want to look up a specific user's account status, recent briefings, and re-engagement notifications by their UUID,
So that I can diagnose delivery failures and support issues without accessing PII.

## Acceptance Criteria

**AC1 — Admin route guard in API:** Given `GET /api/admin/users?userId=[uuid]` is called, when the Route Handler runs, then admin role (`profiles.role === 'admin'`) is verified before any other DB query; unauthenticated returns `401 UNAUTHORIZED`; non-admin returns `403 FORBIDDEN`; missing `SUPABASE_SERVICE_ROLE_KEY` env var returns `500 CONFIG_ERROR`.

**AC2 — UUID validation:** Given a request arrives at `GET /api/admin/users`, when the `userId` query param is absent or not a valid UUID v4/v7 format, then the endpoint returns `400 VALIDATION_ERROR` with a descriptive message; no DB query is executed.

**AC3 — User not found:** Given a valid UUID that does not match any user in the system, when the handler queries Supabase Auth admin API, then it returns `404 NOT_FOUND`.

**AC4 — Response shape (no PII):** Given a valid admin request for an existing user, when the handler runs, then it returns `200` with:
```json
{
  "data": {
    "accountStatus": "verified" | "unverified",
    "briefings": [{ "briefing_date": "YYYY-MM-DD", "email_status": "pending|delivered|failed|skipped_preference" }],
    "reengagementNotifications": [{ "sent_at": "<ISO timestamp>", "email_status": "delivered|failed" }],
    "profileComplete": true | false
  }
}
```
- `briefings`: last 10 records ordered by `briefing_date DESC`
- `reengagementNotifications`: last 5 records ordered by `sent_at DESC`
- `profileComplete`: `true` if a row exists in `profiles` for that user id (all required fields enforced at onboarding)
- No user name, email, health data, financial data, or goal details in the response

**AC5 — Audit log:** Given a successful lookup, when the handler completes, then an audit log entry is written (non-blocking, fire-and-forget): `event_type: 'admin_user_lookup'`, `user_id: adminUserId` (the operator), `metadata: { target_user_id: userId }`.

**AC6 — Admin UI:** Given I am on the `/admin` page, when I navigate to `/admin/users`, then I see a UUID input form; submitting redirects to `/admin/users?userId=[uuid]`; results are displayed as labelled stat cards and tables (account status, briefings list, re-engagement list, profile complete badge); no PII appears.

## Tasks / Subtasks

- [x] **Task 1: Migration 014 — `reengagement_notifications` table**
  - [x] Create `supabase/migrations/014_reengagement_notifications.sql`
  - [x] Table schema: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `email_status TEXT NOT NULL CHECK (email_status IN ('delivered', 'failed'))`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - [x] Create index: `CREATE INDEX IF NOT EXISTS idx_reengagement_notifications_user_id_sent_at ON public.reengagement_notifications(user_id, sent_at DESC)`
  - [x] Enable RLS: `ALTER TABLE public.reengagement_notifications ENABLE ROW LEVEL SECURITY` (no user-facing policy needed — admin-only via service role)
  - [x] Grant permissions: `GRANT SELECT ON public.reengagement_notifications TO service_role`

- [x] **Task 2: Zod validation schema**
  - [x] Create `lib/validation/admin.ts`
  - [x] Write failing test: invalid UUID returns `{ success: false }`, valid UUID returns `{ success: true }`
  - [x] Implement `AdminUserLookupSchema = z.object({ userId: z.string().uuid("userId must be a valid UUID") })`
  - [x] Export `AdminUserLookupInput = z.infer<typeof AdminUserLookupSchema>`
  - [x] Tests pass

- [x] **Task 3: `GET /api/admin/users` route + tests**
  - [x] Write failing tests first: `app/api/admin/__tests__/users.test.ts`
    - [x] 500 CONFIG_ERROR when `SUPABASE_SERVICE_ROLE_KEY` absent
    - [x] 401 when unauthenticated
    - [x] 403 when role ≠ admin
    - [x] 400 VALIDATION_ERROR when `userId` absent
    - [x] 400 VALIDATION_ERROR when `userId` is not a valid UUID
    - [x] 404 NOT_FOUND when user not found in Auth
    - [x] 200 with correct `{ data: { accountStatus, briefings, reengagementNotifications, profileComplete } }` shape
    - [x] `accountStatus` is `"verified"` when `email_confirmed_at` is set
    - [x] `accountStatus` is `"unverified"` when `email_confirmed_at` is null
    - [x] `briefings` contains at most 10 records ordered by `briefing_date DESC`
    - [x] `reengagementNotifications` contains at most 5 records ordered by `sent_at DESC`
    - [x] `profileComplete` is `true` when profile row exists
    - [x] `profileComplete` is `false` when no profile row found
    - [x] Audit log insert called with `event_type: 'admin_user_lookup'` and correct metadata
    - [x] Structured log emitted on success (no PII in log)
  - [x] Implement `app/api/admin/users/route.ts`
  - [x] Run tests — all pass

- [x] **Task 4: Admin UI page + skeleton**
  - [x] Create `app/admin/users/loading.tsx` — skeleton placeholders for the result area
  - [x] Create `app/admin/users/page.tsx` — async RSC
    - [x] UUID input form (GET form, `action="/admin/users"`, `name="userId"`)
    - [x] If `userId` param present in searchParams: call `getAdminUserData(userId)` (extract helper or inline in page)
    - [x] Render result: account status badge, briefings table (date + status), re-engagement table (sent_at + status), profile complete badge
    - [x] Handle not-found: show "User not found" message
    - [x] No PII anywhere on the page

## Dev Notes

### CRITICAL: `reengagement_notifications` table does not exist yet — Task 1 must run first

The current schema only stores `last_reengagement_sent_at TIMESTAMPTZ` as a single column on `profiles`. This is insufficient for "last 5 re-engagement notification records" (AC4). Task 1 creates the `reengagement_notifications` table. **Note:** `lib/inngest/functions/checkInactivity.ts` currently only updates `last_reengagement_sent_at` on the profiles row — updating it to also insert into `reengagement_notifications` is deferred post-story (new table will start empty; the API will return an empty array for `reengagementNotifications` until backfilled).

### CRITICAL: Admin is at `app/admin/` — NOT inside `app/(app)/`

Admin routes live at `app/admin/` (separate from `app/(app)/`). The new page goes at:
```
app/admin/
├── layout.tsx       ← existing role guard + minimal chrome
├── page.tsx         ← existing metrics dashboard
├── loading.tsx      ← existing skeleton
└── users/
    ├── page.tsx     ← NEW: UUID lookup UI
    └── loading.tsx  ← NEW: skeleton
```

### Route handler — exact pattern (match metrics/route.ts)

```ts
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AdminUserLookupSchema } from "@/lib/validation/admin";

export async function GET(req: NextRequest) {
  // 1. Env var guard
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "Server configuration error" } },
      { status: 500 }
    );
  }

  // 2. Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  // 3. Admin role check (service client to bypass RLS)
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError) {
    console.error(JSON.stringify({ event: "admin_role_check_error", code: profileError.code }));
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to verify authorization" } },
      { status: 500 }
    );
  }
  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required." } },
      { status: 403 }
    );
  }

  // 4. UUID validation
  const { searchParams } = new URL(req.url);
  const parsed = AdminUserLookupSchema.safeParse({ userId: searchParams.get("userId") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }
  const { userId } = parsed.data;

  // 5. User existence check via Auth admin API
  const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(userId);
  if (authUserError || !authUser?.user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "User not found" } },
      { status: 404 }
    );
  }

  // 6. Data queries (parallel)
  const [briefingsResult, reengagementResult, profileResult] = await Promise.all([
    adminClient
      .from("briefings")
      .select("briefing_date, email_status")
      .eq("user_id", userId)
      .order("briefing_date", { ascending: false })
      .limit(10),
    adminClient
      .from("reengagement_notifications")
      .select("sent_at, email_status")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(5),
    adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (briefingsResult.error) {
    console.error(JSON.stringify({ event: "admin_user_lookup_error", message: briefingsResult.error.message }));
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch user data" } },
      { status: 500 }
    );
  }

  // 7. Audit log (non-blocking, fire-and-forget — same pattern as export route)
  adminClient
    .from("audit_logs")
    .insert({ user_id: user.id, event_type: "admin_user_lookup", metadata: { target_user_id: userId } })
    .then(({ error }) => {
      if (error) console.error(JSON.stringify({ event: "audit_log_error", code: error.code }));
    });

  // 8. Build response (no PII)
  const accountStatus = authUser.user.email_confirmed_at ? "verified" : "unverified";
  const profileComplete = !!profileResult.data;

  console.log(JSON.stringify({
    event: "admin_user_lookup_success",
    accountStatus,
    briefingCount: briefingsResult.data?.length ?? 0,
    reengagementCount: reengagementResult.data?.length ?? 0,
    profileComplete,
  }));

  return NextResponse.json({
    data: {
      accountStatus,
      briefings: briefingsResult.data ?? [],
      reengagementNotifications: reengagementResult.data ?? [],
      profileComplete,
    },
  });
}
```

### Auth Admin API — `getUserById`

`adminClient.auth.admin.getUserById(userId)` returns `{ data: { user }, error }`. The `user` object has `email_confirmed_at: string | null` — use this to determine `accountStatus`. This API requires the service role key (already present in `adminClient`).

**Mock pattern in tests:**
```ts
const mockAdminAuth = { getUserById: vi.fn() };
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: { admin: mockAdminAuth },
  })),
}));

// Success:
mockAdminAuth.getUserById.mockResolvedValue({
  data: { user: { id: userId, email_confirmed_at: "2026-01-01T00:00:00Z" } },
  error: null,
});

// Not found:
mockAdminAuth.getUserById.mockResolvedValue({
  data: { user: null },
  error: { message: "User not found" },
});
```

### Test mock call sequence (match `metrics.test.ts` pattern)

The `mockAdminFrom` uses a call-index counter for each `.from()` call per request:

```
Call 1: profiles — role check (.select("role").eq(id, userId).single())
Call 2: briefings — last 10 (.select(...).eq("user_id",...).order(...).limit(10))
Call 3: reengagement_notifications — last 5 (.select(...).eq("user_id",...).order(...).limit(5))
Call 4: profiles — profileComplete check (.select("id").eq("id", userId).maybeSingle())
Call 5+: audit_logs — insert (fire-and-forget, call index 5)
```

Note: `getUserById` is on `auth.admin`, not `from()`, so it doesn't increment the from-counter.

Parallel queries (briefings, reengagement, profile) run via `Promise.all` — they will be dispatched in order so mock call indices still apply.

```ts
let callIndex = 0;
mockAdminFrom.mockImplementation(() => {
  callIndex++;
  const idx = callIndex;

  if (idx === 1) {
    // profiles role check
    const single = vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    return { select: vi.fn().mockReturnValue({ eq }) };
  }
  if (idx === 2) {
    // briefings
    const limit = vi.fn().mockResolvedValue({ data: briefingsData, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    return { select: vi.fn().mockReturnValue({ eq }) };
  }
  if (idx === 3) {
    // reengagement_notifications
    const limit = vi.fn().mockResolvedValue({ data: reengagementData, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    return { select: vi.fn().mockReturnValue({ eq }) };
  }
  if (idx === 4) {
    // profiles profileComplete
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: userId }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    return { select: vi.fn().mockReturnValue({ eq }) };
  }
  if (idx === 5) {
    // audit_logs insert (fire-and-forget)
    return { insert: vi.fn().mockReturnValue({ then: vi.fn() }) };
  }
  return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
});
```

### Validation schema — exact implementation

```ts
// lib/validation/admin.ts
import { z } from "zod";

export const AdminUserLookupSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

export type AdminUserLookupInput = z.infer<typeof AdminUserLookupSchema>;
```

Follow the pattern from `lib/validation/goal.ts` — schema + inferred type, both exported.

### Existing Zod validation pattern

From `lib/validation/goal.ts`:
```ts
export const GoalInputSchema = z.object({ ... });
export type GoalInput = z.infer<typeof GoalInputSchema>;
```

Routes call `Schema.safeParse(body)` and check `parsed.success` before proceeding.

### Audit log pattern (non-blocking)

From `app/api/export/route.ts`:
```ts
supabase
  .from("audit_logs")
  .insert({ user_id, event_type: "data_export_requested" })
  .then(({ error }) => {
    if (error) console.error(JSON.stringify({ event: "audit_log_error", code: error.code }));
  });
```

Use this exact same fire-and-forget pattern. The audit log must NOT block the response — don't `await` it.

### `audit_logs` table schema

From migration 001:
```
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID REFERENCES auth.users ON DELETE SET NULL
event_type TEXT NOT NULL
metadata JSONB
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

For Story 7.2: `user_id = adminUserId` (operator performing the lookup), `metadata = { target_user_id: userId }`.

### UI page — GET form pattern

The search form uses a `<form method="GET">` so the UUID appears in the URL as a query param — this makes result pages bookmarkable and linkable.

```tsx
// app/admin/users/page.tsx
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { userId?: string };
}) {
  const userId = searchParams.userId;
  // ... render form; if userId present, fetch and render results
}
```

For the data fetch inside the page, extract a helper function or inline the fetch. The page lives inside `app/admin/` so the admin layout already enforces the role guard — the page itself does NOT need to re-check the role (the API route handles auth when called directly).

However, for server-side rendering the results directly (without calling the API), import the same service-role client and queries. The cleaner approach is to call `GET /api/admin/users?userId=...` from a client component, OR extract a shared `getAdminUserData(userId)` function analogous to `lib/admin/getMetrics.ts`. **Recommended:** extract `lib/admin/getUserData.ts` that the page calls directly (avoids internal HTTP fetch anti-pattern, same lesson learned from Story 7.1).

### `profileComplete` — meaning

From the architecture: onboarding wizard enforces all required profile fields before the user can proceed. Therefore, if a `profiles` row exists for the user_id, the profile is complete. Query with `.maybeSingle()` (not `.single()`) to avoid a PostgREST 406 error when the row doesn't exist — `maybeSingle()` returns `{ data: null, error: null }` when no row is found.

### `briefings` table — relevant columns

From migration 006:
```sql
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
briefing_date DATE NOT NULL
email_status TEXT DEFAULT 'pending' CHECK (email_status IN ('pending','delivered','failed','skipped_preference'))
```

### Structured log — no PII

The success log must NOT include `userId`, `email`, or any PII:
```ts
console.log(JSON.stringify({
  event: "admin_user_lookup_success",
  accountStatus,
  briefingCount: briefingsResult.data?.length ?? 0,
  reengagementCount: reengagementResult.data?.length ?? 0,
  profileComplete,
}));
```

### Error response format

Matches all other admin routes:
```ts
{ error: { code: "ERROR_CODE", message: "Human-readable description" } }
```

Success:
```ts
{ data: { accountStatus, briefings, reengagementNotifications, profileComplete } }
```

### Previous story learnings (from 7.1)

1. **PostgREST 1k row limit**: Not relevant here — both queries use `.limit(10)` and `.limit(5)` explicitly.
2. **Service role for cross-user queries**: Required. Use `createClient as createSupabaseClient` from `@supabase/supabase-js`.
3. **Error handling — don't silently ignore**: Every Supabase query result must be checked for `error`. Throw or return 500 immediately.
4. **No HTTP self-fetch**: The page must NOT call its own API route internally. Use a shared lib function instead.
5. **Env var guard first**: Check `SUPABASE_SERVICE_ROLE_KEY` at the very top of the route handler before any other logic.
6. **`profileError` check**: When querying the role, check `profileError` first and return 500 if it fails (not just null-check on `profile`).

### Deferred

- Backfill of `reengagement_notifications` from existing `last_reengagement_sent_at` data
- Update `lib/inngest/functions/checkInactivity.ts` to write to `reengagement_notifications` on send (tracked in deferred-work.md)

## Dev Agent Record

### Implementation Plan

TDD approach: wrote failing tests for validation schema and route handler before implementation. Fixed Zod v4 `.issues` property (not `.errors`). Used `Promise.all` for parallel briefings/reengagement/profile queries. Extracted `lib/admin/getUserData.ts` shared function to avoid internal HTTP fetch in UI page (lesson from Story 7.1).

### Debug Log

- Zod v4 uses `.issues` not `.errors` on ZodError — fixed in route.ts line 54.

### Completion Notes

- Migration 014: `reengagement_notifications` table with RLS enabled, index on `(user_id, sent_at DESC)`.
- `lib/validation/admin.ts`: `AdminUserLookupSchema` with UUID validation; 5 tests all pass.
- `app/api/admin/users/route.ts`: Full auth chain (env guard → auth → role check → UUID validation → getUserById → parallel queries → audit log → response); 15 tests all pass.
- `lib/admin/getUserData.ts`: Shared function used by UI page to avoid internal HTTP fetch anti-pattern.
- `app/admin/users/page.tsx`: GET form, async RSC, renders stat cards + briefings table + re-engagement table; handles not-found and validation errors; no PII.
- `app/admin/users/loading.tsx`: Skeleton cards and table placeholders.
- Full regression suite: 442 tests pass (was 422 before story, +20 new tests).
- TypeScript: clean compile, no errors.

## File List

### New Files
- `supabase/migrations/014_reengagement_notifications.sql`
- `lib/validation/admin.ts`
- `lib/validation/__tests__/admin.test.ts`
- `lib/admin/getUserData.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/__tests__/users.test.ts`
- `app/admin/users/page.tsx`
- `app/admin/users/loading.tsx`

### Modified Files
- `_bmad-output/implementation-artifacts/7-2-per-user-email-delivery-lookup.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

| Date | Change |
|------|--------|
| 2026-06-12 | Story created — ready-for-dev |
| 2026-06-12 | Implementation complete — all 4 tasks done, 20 new tests pass, ready for review |
