# Story 6.2: Data Summary & Account Deletion

Status: done

## Story

As a signed-in user,
I want to view a summary of what data is stored about me and permanently delete my account,
So that I can exercise my GDPR/CCPA rights to transparency and erasure.

## Acceptance Criteria

**AC1 — Data summary display (RSC):** Given I navigate to `/data`, when the page loads via RSC, then a human-readable data summary is shown: profile fields stored (name, age, gender, height, weight, location, budget, briefing time), goal count, check-in count and date range, briefing count, consent date (= `profiles.created_at`), and sub-processor list (Supabase, Anthropic, Resend, Vercel, Inngest); all data fetched using the authenticated user's session with RLS enforced.

**AC2 — Delete account dialog:** Given I scroll to the bottom of `/data`, when I tap "Delete my account", then a Dialog opens with: title "Delete your account", body "This will permanently delete your account and all associated data — briefings, check-ins, goals, and profile. This cannot be undone.", and two buttons: "Delete my account permanently" (destructive red variant) and "Keep my account" (primary).

**AC3 — DELETE /api/profile handler:** Given I confirm deletion, when `DELETE /api/profile` runs, then in strict order:
1. An `audit_logs` row is written with `event_type: 'account_deleted'` (using service-role client)
2. All `checkins`, `briefings`, `goals`, and `audit_logs` rows for the user are hard-deleted (service-role client)
3. The Supabase Auth user record is deleted via `adminClient.auth.admin.deleteUser(userId)` (cascades to `profiles`)
4. The session cookie is invalidated via `supabase.auth.signOut()`
5. Returns `{ data: { deleted: true } }`

**AC4 — Post-deletion redirect:** Given deletion completes successfully, when the client receives the 200 response, then the user is redirected to `/sign-in?message=account_deleted`.

**AC5 — Account deleted message on sign-in:** Given the sign-in page receives `?message=account_deleted` in the URL, when it renders, then a `CoachVoiceLine` is displayed above the form: "Your account has been permanently deleted. We're sorry to see you go."

**AC6 — Structured logging:** Given the DELETE handler runs, when it completes, then it emits `{ event: 'account_deleted', userId }` — no email address or personal data in log fields.

**AC7 — Export button preserved:** The "Request data export" button and its full behavior from Story 6.1 must remain functional on the `/data` page alongside the new summary and deletion UI.

## Tasks / Subtasks

- [x] **Task 1 — Refactor /data page to RSC + extract DataActions client component** (AC: #1, #7)
  - [x] Convert `app/(app)/data/page.tsx` from `"use client"` to async RSC (remove `"use client"` directive, add `async`)
  - [x] In the RSC: get user via `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()` — redirect to `/sign-in` if no user
  - [x] Fetch in parallel via `Promise.all`: profile (`.from("profiles").select("*").eq("id", user.id).single()`), goal count (`.select("*", { count: "exact", head: true }).eq("user_id", user.id)`), checkin count + date range (3 separate calls: count head-only, oldest `.order("checked_in_at", ascending:true).limit(1)`, newest `.order("checked_in_at", ascending:false).limit(1)`), briefing count (`.select("*", { count: "exact", head: true }).eq("user_id", user.id)`)
  - [x] Render data summary section (see Dev Notes for layout spec)
  - [x] Create `app/(app)/data/DataActions.tsx` as `"use client"` component — receives no props; handles: export button (all logic from old page.tsx) and delete account dialog trigger
  - [x] Render `<DataActions />` below the data summary section
  - [x] Existing export behavior (rate limit error display, success CoachVoiceLine) must be fully preserved inside `DataActions`

- [x] **Task 2 — DELETE /api/profile route** (AC: #3, #6)
  - [x] Add `DELETE` export to `app/api/profile/route.ts` (existing file — do NOT break GET, POST, PATCH)
  - [x] Auth check: `createClient()` → `supabase.auth.getUser()` → 401 if no user
  - [x] Create admin client: `createSupabaseClient(NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)` (from `@supabase/supabase-js`)
  - [x] Step 1 — Audit log: `await adminClient.from("audit_logs").insert({ user_id: userId, event_type: "account_deleted" })`; throw `DB_ERROR` 500 if this fails (we need the audit record before destroying data)
  - [x] Step 2 — Hard deletes in sequence (NOT parallel — order matters for compliance):
    - `await adminClient.from("checkins").delete().eq("user_id", userId)`
    - `await adminClient.from("briefings").delete().eq("user_id", userId)`
    - `await adminClient.from("goals").delete().eq("user_id", userId)`
    - `await adminClient.from("audit_logs").delete().eq("user_id", userId)` (deletes all audit rows including the one just written — console log is the durable record)
  - [x] Step 3 — Delete auth user: `await adminClient.auth.admin.deleteUser(userId)` — cascades to `profiles` row automatically
  - [x] Step 4 — Invalidate session: `await supabase.auth.signOut()`
  - [x] Step 5 — Log: `console.log(JSON.stringify({ event: "account_deleted", userId }))`
  - [x] Return `NextResponse.json({ data: { deleted: true } })`
  - [x] On any error after audit log written but before completion: log the error with `console.error` and return 500 — do NOT partially delete

- [x] **Task 3 — Delete dialog in DataActions** (AC: #2, #4)
  - [x] Import `Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter` from `@/components/ui/dialog`
  - [x] State: `deleteStatus: "idle" | "loading" | "error"`, `showConfirmDialog: boolean`
  - [x] "Delete my account" button at bottom of `DataActions` — `variant="destructive"` — sets `showConfirmDialog = true` on click
  - [x] Guard: `if (deleteStatus === "loading") return;` at the start of the confirm handler
  - [x] Dialog body: title "Delete your account", description exact text from AC2
  - [x] "Keep my account" button — `variant="default"` — closes dialog (`showConfirmDialog = false`)
  - [x] "Delete my account permanently" button — `variant="destructive"` — calls `handleDelete()`, shows loading state on button, disables both buttons while loading
  - [x] `handleDelete()`: `setDeleteStatus("loading")` → `fetch("/api/profile", { method: "DELETE" })` → on 200: `window.location.href = "/sign-in?message=account_deleted"` → on non-200: `setDeleteStatus("error")`, close dialog, show error banner
  - [x] Error state: amber alert banner with "Something went wrong. Please try again." (same pattern as export error in Story 6.1)

- [x] **Task 4 — Sign-in page: account deleted message** (AC: #5)
  - [x] In `app/(auth)/sign-in/page.tsx`, add `const message = searchParams.get("message");` (existing `searchParams` already present via `useSearchParams()`)
  - [x] Import `CoachVoiceLine` from `@/components/ui/coach-voice-line`
  - [x] Add conditional rendering ABOVE the `{serverError && ...}` block: `{message === "account_deleted" && (<CoachVoiceLine variant="closing">Your account has been permanently deleted. We&apos;re sorry to see you go.</CoachVoiceLine>)}`

- [x] **Task 5 — Tests** (AC: #1–#7)
  - [x] `app/api/profile/__tests__/profile-delete.test.ts` — 11 tests covering: 401 unauthenticated, audit log written first, 500 when audit log fails (no further deletion), checkins/briefings/goals/audit_logs deleted, auth user deleted, signOut called, structured log emitted (no PII), returns `{ data: { deleted: true } }`
  - [x] `app/(app)/data/__tests__/DataActions.test.tsx` — 9 tests: export button preserved, success/error states, delete button opens dialog, "Keep my account" closes dialog, confirm calls DELETE /api/profile, redirects on success, error banner on failure
  - [x] `app/(auth)/__tests__/sign-in-account-deleted.test.tsx` — 2 tests: CoachVoiceLine shown for account_deleted message, form still renders
  - [x] Fixed `lib/inngest/__tests__/exportUserData.test.ts` — updated mocks to chain `.limit()` after Story 6.1 P3 patch
  - [x] Fixed `app/api/export/__tests__/export.test.ts` — added rate-limit mock + objectContaining for idempotency key after Story 6.1 patches

### Review Findings

- [x] [Review][Decision] `deleteUser` failure after all 4 table deletes — resolved: option (c) `pending_deletion` soft flag; migration 011 adds column; DELETE handler sets flag before step-2 deletes; `/data` page shows pending-deletion banner with retry prompt [app/api/profile/route.ts]
- [x] [Review][Patch] Step-2 hard-deletes have no error checking — each delete now checked; any failure calls signOut and returns 500; stops before deleteUser [app/api/profile/route.ts]
- [x] [Review][Patch] AC1 layout deviation — `Member since` moved from Profile `<dl>` to Activity `<dl>` [app/(app)/data/page.tsx]
- [x] [Review][Patch] Falsy-zero check hides `height=0` and `weight=0` — changed to `!= null` for `age`, `height`, `weight` [app/(app)/data/page.tsx]
- [x] [Review][Patch] `signOut` not called on `deleteUser` failure path — signOut now called on all error paths after pending_deletion flag is set [app/api/profile/route.ts]
- [x] [Review][Patch] `userId` in `console.error` on failure — removed from error log; only `step` and `code` logged [app/api/profile/route.ts]
- [x] [Review][Defer] Dialog missing `aria-labelledby` pointing at DialogTitle — pre-existing component library pattern, tracked separately [app/(app)/data/DataActions.tsx:106]
- [x] [Review][Defer] Export and delete handlers can execute concurrently (independent guards) — low probability race, requires significant state coordination to fix [app/(app)/data/DataActions.tsx:24-53]
- [x] [Review][Defer] Single check-in renders "Jan 2025 – Jan 2025" date range — cosmetic, harmless [app/(app)/data/page.tsx:50-53]

## Dev Notes

### CRITICAL: `notifications` table does not exist — skip it

The epic mentions deleting `notifications` rows. **This table does not exist.** Notification preferences are stored as `notification_preferences` JSONB inside the `profiles` row, which is deleted automatically via cascade when the auth user is deleted. Do NOT attempt to delete from a `notifications` table.

### CRITICAL: Page architecture refactor — RSC + client split

The current `app/(app)/data/page.tsx` is a `"use client"` component (Story 6.1). Story 6.2 requires the summary data to load server-side. This requires a split architecture:

```
app/(app)/data/
├── page.tsx          ← async RSC (NO "use client") — fetches data, renders summary
└── DataActions.tsx   ← "use client" — export button + delete dialog (moved from old page.tsx)
```

`page.tsx` must NOT have `"use client"` at the top. It is an `async` function that does server-side data fetching.

### Data summary section layout

```tsx
// In page.tsx (RSC) — render above <DataActions />
<section aria-label="Your data summary" className="mb-10 space-y-6">
  <h2 className="text-lg font-semibold">What we store about you</h2>
  
  {/* Profile fields */}
  <div>
    <h3 className="text-sm font-medium text-muted-foreground mb-2">Profile</h3>
    <dl className="text-sm space-y-1">
      <div className="flex gap-2"><dt className="text-muted-foreground">Name:</dt><dd>{profile.name}</dd></div>
      <div className="flex gap-2"><dt className="text-muted-foreground">Age:</dt><dd>{profile.age}</dd></div>
      // ... gender, height, weight, location, discretionary_budget (as "Monthly budget"), briefing_time
    </dl>
  </div>
  
  {/* Activity counts */}
  <div>
    <h3 className="text-sm font-medium text-muted-foreground mb-2">Activity</h3>
    <dl className="text-sm space-y-1">
      <div className="flex gap-2"><dt className="text-muted-foreground">Goals:</dt><dd>{goalCount ?? 0}</dd></div>
      <div className="flex gap-2"><dt className="text-muted-foreground">Check-ins:</dt>
        <dd>{checkinCount ?? 0}{checkinCount && checkinCount > 0 ? ` (${formatDate(oldest)} – ${formatDate(newest)})` : ""}</dd>
      </div>
      <div className="flex gap-2"><dt className="text-muted-foreground">Briefings:</dt><dd>{briefingCount ?? 0}</dd></div>
      <div className="flex gap-2"><dt className="text-muted-foreground">Member since:</dt><dd>{formatDate(profile.created_at)}</dd></div>
    </dl>
  </div>

  {/* Sub-processors */}
  <div>
    <h3 className="text-sm font-medium text-muted-foreground mb-2">Data processors</h3>
    <p className="text-sm text-muted-foreground">
      Your data is processed by: Supabase (database, auth, storage), Anthropic (AI briefings), 
      Resend (email delivery), Vercel (hosting), Inngest (background jobs).
    </p>
  </div>
</section>
```

Use a simple `formatDate` helper: `new Date(dateStr).toLocaleDateString("en-GB", { month: "short", year: "numeric" })` or equivalent. Define it at the top of page.tsx.

### RSC data fetching pattern

```ts
// app/(app)/data/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DataActions from "./DataActions";

export default async function DataPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [
    profileRes,
    { count: goalCount },
    { count: checkinCount },
    { data: oldestCheckin },
    { data: newestCheckin },
    { count: briefingCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("goals").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("checkins").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("checkins").select("checked_in_at").eq("user_id", user.id).order("checked_in_at", { ascending: true }).limit(1),
    supabase.from("checkins").select("checked_in_at").eq("user_id", user.id).order("checked_in_at", { ascending: false }).limit(1),
    supabase.from("briefings").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
  // ... render summary + <DataActions />
}
```

### DELETE /api/profile — service-role client pattern

This mirrors the pattern used in `lib/inngest/functions/exportUserData.ts`:

```ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Inside DELETE handler, after auth check:
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Deletion order is non-negotiable** — audit log must be written before any data is deleted:

```ts
// 1. Audit log (throw 500 if this fails — can't proceed without compliance record)
const { error: auditError } = await adminClient
  .from("audit_logs")
  .insert({ user_id: userId, event_type: "account_deleted" });
if (auditError) {
  return NextResponse.json(
    { error: { code: "DB_ERROR", message: "Failed to initiate account deletion." } },
    { status: 500 }
  );
}

// 2. Hard deletes — sequential, not parallel (order matters)
await adminClient.from("checkins").delete().eq("user_id", userId);
await adminClient.from("briefings").delete().eq("user_id", userId);
await adminClient.from("goals").delete().eq("user_id", userId);
await adminClient.from("audit_logs").delete().eq("user_id", userId);

// 3. Delete auth user — cascades to profiles row
const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
if (deleteError) throw new Error(`Auth deletion failed: ${deleteError.message}`);

// 4. Clear session cookie
await supabase.auth.signOut();

// 5. Structured log
console.log(JSON.stringify({ event: "account_deleted", userId }));

return NextResponse.json({ data: { deleted: true } });
```

### Cascade behavior reference

When `adminClient.auth.admin.deleteUser(userId)` runs:
- `profiles` row → **CASCADE deleted** (FK: `profiles.id REFERENCES auth.users(id) ON DELETE CASCADE`)
- `goals` rows → already deleted in step 2 (but cascade would also cover them)
- `checkins` rows → already deleted in step 2
- `briefings` rows → already deleted in step 2
- `audit_logs.user_id` → **SET NULL** (FK: `ON DELETE SET NULL`) — these were already deleted in step 2

The explicit deletions in step 2 are done BEFORE the auth user delete intentionally — to ensure a clean GDPR erasure compliant with Art. 17 where we want all data gone before the auth record is removed.

### DataActions client component

Move ALL existing `"use client"` logic from `app/(app)/data/page.tsx` into `app/(app)/data/DataActions.tsx`. Then ADD the deletion dialog state.

```tsx
// app/(app)/data/DataActions.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type ExportStatus = "idle" | "loading" | "success" | "error";
type DeleteStatus = "idle" | "loading" | "error";

export default function DataActions() {
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportError, setExportError] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>("idle");
  const [deleteError, setDeleteError] = useState("");

  async function handleExport() {
    if (exportStatus === "loading") return;
    setExportStatus("loading");
    setExportError("");
    const res = await fetch("/api/export", { method: "POST" });
    if (res.ok) {
      setExportStatus("success");
    } else {
      const json = await res.json().catch(() => ({}));
      setExportError(
        (json as { error?: { message?: string } })?.error?.message ??
          "Something went wrong. Please try again."
      );
      setExportStatus("error");
    }
  }

  async function handleDelete() {
    if (deleteStatus === "loading") return;
    setDeleteStatus("loading");
    setDeleteError("");
    const res = await fetch("/api/profile", { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/sign-in?message=account_deleted";
    } else {
      setDeleteStatus("error");
      setDeleteError("Something went wrong. Please try again.");
      setShowConfirmDialog(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Export section */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Export your data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Request a full copy of all the data LifePilot holds about you.
          We&apos;ll email you a download link within a few minutes.
        </p>
        {exportStatus === "success" ? (
          <CoachVoiceLine variant="closing">
            Your export is being prepared — you&apos;ll receive an email when it&apos;s ready.
          </CoachVoiceLine>
        ) : (
          <>
            {exportStatus === "error" && (
              <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
                {exportError}
              </div>
            )}
            <Button onClick={handleExport} disabled={exportStatus === "loading"}>
              {exportStatus === "loading" ? "Requesting…" : "Request data export"}
            </Button>
          </>
        )}
      </div>

      <hr className="border-border" />

      {/* Delete section */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Delete your account</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        {deleteStatus === "error" && (
          <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            {deleteError}
          </div>
        )}
        <Button variant="destructive" onClick={() => setShowConfirmDialog(true)}>
          Delete my account
        </Button>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogHeader>
          <DialogTitle>Delete your account</DialogTitle>
          <DialogDescription>
            This will permanently delete your account and all associated data — briefings, check-ins,
            goals, and profile. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="default" onClick={() => setShowConfirmDialog(false)} disabled={deleteStatus === "loading"}>
            Keep my account
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteStatus === "loading"}>
            {deleteStatus === "loading" ? "Deleting…" : "Delete my account permanently"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
```

### Sign-in page update — exact change

In `app/(auth)/sign-in/page.tsx`, the `searchParams` hook is already imported. Add:

```tsx
// Add this import at the top:
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

// Inside SignInPage() component body, after existing searchParams usage:
const message = searchParams.get("message");

// In JSX, add BEFORE the serverError block (after the opening <div> of the form container):
{message === "account_deleted" && (
  <CoachVoiceLine variant="closing">
    Your account has been permanently deleted. We&apos;re sorry to see you go.
  </CoachVoiceLine>
)}
```

### Files to CREATE

```
app/(app)/data/DataActions.tsx     — client component (export + delete dialog)
app/api/profile/__tests__/profile-delete.test.ts
app/(app)/data/__tests__/DataActions.test.tsx
```

### Files to MODIFY

```
app/(app)/data/page.tsx            — refactor from "use client" to async RSC
app/api/profile/route.ts           — add DELETE handler (do NOT touch GET, POST, PATCH)
app/(auth)/sign-in/page.tsx        — add message param handling + CoachVoiceLine
```

### Files NOT to touch

```
app/api/export/route.ts
lib/inngest/functions/exportUserData.ts
lib/inngest/functions/retentionCleanup.ts
app/api/inngest/route.ts           — no new Inngest function needed (deletion is synchronous)
supabase/migrations/               — no new migrations needed
proxy.ts                           — /data already protected
```

### Previous story intelligence (Story 6.1)

- Code review patches applied: rate limiting, HTML escaping, idempotency key, row limits
- Export button in old `page.tsx` has `if (status === "loading") return;` guard — preserve in `DataActions`
- `CoachVoiceLine` used with `variant="closing"` for success states
- Amber alert pattern with `role="alert"` for error states
- `checkRateLimit` may return `RATE_LIMITED` 429 — error banner must handle this message text (already handled by generic error message display)

### Auth pattern reference (from `app/api/profile/route.ts`)

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }
  // ... rest of handler
}
```

### Testing patterns

For `DELETE /api/profile` tests, mock both clients:

```ts
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  })),
}));
```

For `DataActions.test.tsx`, mock fetch:

```ts
global.fetch = vi.fn();
// Test: confirm calls DELETE /api/profile
(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { deleted: true } }) });
```

### Supabase client import naming conflict

Both the server utility and the `@supabase/supabase-js` package export `createClient`. Use aliased import:

```ts
import { createClient } from "@/utils/supabase/server";         // SSR client
import { createClient as createSupabaseClient } from "@supabase/supabase-js"; // admin client
```

This is the same pattern used in `lib/inngest/functions/exportUserData.ts`.

## Dev Agent Record

### Agent Model Used

(to be filled)

### Debug Log References

(none)

### Completion Notes List

- All 5 tasks complete; 397 tests passing (22 new), 0 regressions.
- `app/(app)/data/page.tsx` refactored from `"use client"` to async RSC — fetches profile, goal count, checkin count + date range, briefing count server-side via 6 parallel Supabase queries.
- `app/(app)/data/DataActions.tsx` created as client component — handles export button (full 6.1 behavior preserved) and delete confirmation dialog.
- `DELETE /api/profile` added to existing route file — uses service-role admin client; ordered deletion: audit log → checkins → briefings → goals → audit_logs → deleteUser (cascade) → signOut.
- `notifications` table doesn't exist — not attempted (notification prefs live in `profiles.notification_preferences` JSONB, deleted via cascade).
- Sign-in page shows `CoachVoiceLine` when `?message=account_deleted` is present.
- Also fixed 2 pre-existing test regressions from Story 6.1 patches: `.limit()` chain mock in exportUserData tests, rate-limit + idempotency key mock in export route tests.

### File List

- app/(app)/data/page.tsx (modified — refactored to async RSC; review: falsy-zero fixes, Member since moved to Activity, pending_deletion banner)
- app/(app)/data/DataActions.tsx (created — "use client" component)
- app/(app)/data/__tests__/DataActions.test.tsx (created — 9 tests)
- app/api/profile/route.ts (modified — added DELETE handler; review: pending_deletion flag, per-table error checking, signOut on all error paths, PII-free error logs)
- app/api/profile/__tests__/profile-delete.test.ts (created — 14 tests; review: update mock + 3 new tests)
- app/(auth)/sign-in/page.tsx (modified — account_deleted message)
- app/(auth)/__tests__/sign-in-account-deleted.test.tsx (created — 2 tests)
- lib/inngest/__tests__/exportUserData.test.ts (modified — fixed .limit() chain mock)
- app/api/export/__tests__/export.test.ts (modified — added rate-limit mock + objectContaining)
- supabase/migrations/011_profiles_pending_deletion.sql (created — pending_deletion column)

### Change Log

- 2026-06-12: Story created — Sprint 6, Epic 6 Story 2; GDPR data summary + account deletion
- 2026-06-12: Implementation complete — all ACs satisfied, 397 tests passing (22 new)
- 2026-06-12: Code review patches applied — D1 pending_deletion flag (migration 011), step-2 error checking, signOut on all failure paths, PII-free error logs, falsy-zero fixes, Member since layout fix; 14 tests (3 new); status → done
