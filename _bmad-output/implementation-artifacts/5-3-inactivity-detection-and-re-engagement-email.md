# Story 5.3: Inactivity Detection & Re-engagement Email

Status: done

## Story

As a LifePilot system,
I want to detect when a user hasn't checked in for 3+ days and send them a re-engagement email,
So that users who drift away are nudged back into their daily habit.

## Acceptance Criteria

**AC1 — Inactivity detection job:** A scheduled Inngest function `checkInactivity` runs daily (cron: `"0 9 * * *"` — 9 AM UTC). For each user who has opted into re-engagement emails (`notification_preferences.reengagementEmails = true`, opt-in by default), it checks: has the user checked in in the last 3 days (UTC calendar days)? If not, and if their last re-engagement email was sent more than 3 days ago (or never sent), send a re-engagement email.

**AC2 — Re-engagement email:** The email is sent via Resend using `getResendClient()` with:
- Subject: `"Your streak is waiting, {firstName}"` — use `profile.name` or `"there"` if null
- Body: a warm coaching nudge — brief, motivating, with a CTA link to `{APP_BASE_URL}/checkin`
- From: same `RESEND_FROM_EMAIL` env var as briefing emails
- To: user's email address fetched via `supabase.auth.admin.getUserById(userId)`

**AC3 — Rate limiting:** A user receives at most one re-engagement email per 3-day window. Track using the existing `last_reengagement_sent_at` column (nullable `TIMESTAMPTZ`) on the `profiles` table. Before sending, check: `last_reengagement_sent_at IS NULL OR last_reengagement_sent_at < NOW() - INTERVAL '3 days'`. After sending, update `last_reengagement_sent_at = NOW()`.

**AC4 — Opt-out:** Users who have `notification_preferences.reengagementEmails = false` are skipped. Default is `true` (opt-in). The `notification_preferences` column is JSONB on `profiles` with shape `{ reengagementEmails: boolean, briefingEmails: boolean }` (camelCase keys, matching the existing schema).

**AC5 — Database migration:** The `last_reengagement_sent_at TIMESTAMPTZ` and `notification_preferences JSONB` columns already exist in `supabase/migrations/002_profiles.sql`. A new guard migration (`007_add_reengagement_tracking.sql`) must be created using `ADD COLUMN IF NOT EXISTS` to ensure the columns are present in any environment where the schema may have diverged.

## Tasks / Subtasks

- [x] **Task 1 — `checkInactivity` Inngest function** (AC: #1, #2, #3, #4)
  - [x] Create `lib/inngest/functions/checkInactivity.ts`
  - [x] Register the cron trigger: `{ cron: "0 9 * * *" }` — runs daily at 9 AM UTC
  - [x] `step.run("find-inactive-users")`: query `profiles` for users with `notification_preferences->reengagementEmails = true`; filter to those where `last_reengagement_sent_at IS NULL OR last_reengagement_sent_at < NOW() - INTERVAL '3 days'`; select `id, name, last_reengagement_sent_at, notification_preferences`
  - [x] Use a service-role Supabase client (same pattern as `retentionCleanup.ts`) to query across all users without RLS blocking the read
  - [x] For each candidate profile, check: does a `checkins` row exist where `user_id = profile.id AND checked_in_at >= NOW() - INTERVAL '3 days'`? If yes, skip. If no, include in the send list
  - [x] Fan-out: `Promise.all(usersToContact.map((user) => step.run(\`send-reengagement-${user.id}\`, ...)))` — one `step.run` per user
  - [x] Inside each fan-out step: fetch user email via `supabase.auth.admin.getUserById(userId)`; build email with `buildReengagementEmail(firstName, appUrl)`; send via `getResendClient()`; update `profiles.last_reengagement_sent_at = NOW()` on success
  - [x] Structured log on send: `console.log(JSON.stringify({ event: "reengagement_sent", userId }))` — no email address, no name
  - [x] On Resend error: structured log `console.error(JSON.stringify({ event: "reengagement_send_failed", userId, code }))` — do not update `last_reengagement_sent_at`

- [x] **Task 2 — Email template helper** (AC: #2)
  - [x] Add `buildReengagementEmail(firstName: string, appUrl: string)` as a named export in `lib/inngest/functions/checkInactivity.ts` (or extract to `lib/email/templates/reengagement.ts` if preferred — keep consistent with briefing template location)
  - [x] Subject: `` `Your streak is waiting, ${firstName}` ``
  - [x] HTML body: greeting paragraph, 1–2 sentence nudge, CTA anchor `<a href="${appUrl}/checkin">Check in now →</a>`, coach sign-off `"— Your LifePilot coach"`
  - [x] Plain-text alternative: same content without HTML tags, CTA as full URL

- [x] **Task 3 — Database migration** (AC: #5)
  - [x] Create `supabase/migrations/007_add_reengagement_tracking.sql`
  - [x] Use `ADD COLUMN IF NOT EXISTS` for both columns to be idempotent
  - [x] `last_reengagement_sent_at TIMESTAMPTZ` (nullable)
  - [x] `notification_preferences JSONB NOT NULL DEFAULT '{"reengagementEmails": true, "briefingEmails": true}'::jsonb`

- [x] **Task 4 — Register function in Inngest route handler** (AC: #1)
  - [x] Add `import { checkInactivity } from "@/lib/inngest/functions/checkInactivity"` to `app/api/inngest/route.ts`
  - [x] Add `checkInactivity` to the `functions` array in `serve({ client: inngest, functions: [...] })`

- [x] **Task 5 — Tests** (AC: #1–#4)
  - [x] Create `lib/inngest/__tests__/checkInactivity.test.ts` with ≥ 8 tests (see Dev Notes for required cases)

## Dev Notes

### Inngest v4 function pattern (from `lib/inngest/functions/generateBriefing.ts`)

```ts
// lib/inngest/functions/checkInactivity.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { getResendClient } from "@/lib/email/resend";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lifepilot.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "briefing@lifepilot.app";

export const checkInactivity = inngest.createFunction(
  { id: "check-inactivity", name: "Check Inactivity Daily", retries: 3 },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    const usersToContact = await step.run("find-inactive-users", async () => {
      // Service-role client: bypasses RLS to read across all profiles
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const threeDaysAgo = new Date();
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);

      // Fetch opted-in profiles where rate limit window has passed
      const { data: profiles, error } = await adminClient
        .from("profiles")
        .select("id, name, last_reengagement_sent_at, notification_preferences")
        .filter("notification_preferences->reengagementEmails", "eq", true)
        .or(
          `last_reengagement_sent_at.is.null,last_reengagement_sent_at.lt.${threeDaysAgo.toISOString()}`
        );

      if (error) throw new Error(`Profiles fetch failed: ${error.message}`);

      // Filter to profiles with no check-in in the last 3 days
      const inactive = [];
      for (const profile of profiles ?? []) {
        const { data: recentCheckin } = await adminClient
          .from("checkins")
          .select("id")
          .eq("user_id", profile.id)
          .gte("checked_in_at", threeDaysAgo.toISOString())
          .limit(1)
          .maybeSingle();

        if (!recentCheckin) {
          inactive.push(profile);
        }
      }
      return inactive;
    });

    // Fan-out: one step per inactive user
    await Promise.all(
      usersToContact.map((user) =>
        step.run(`send-reengagement-${user.id}`, async () => {
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          const resend = getResendClient();

          const { data: authUser } = await adminClient.auth.admin
            .getUserById(user.id)
            .catch(() => ({ data: null }));
          const userEmail = (authUser as { user?: { email?: string } } | null)?.user?.email;

          if (!userEmail) {
            console.error(JSON.stringify({ event: "reengagement_send_failed", userId: user.id, code: "NO_EMAIL" }));
            return;
          }

          const firstName = (user.name as string | null) ?? "there";
          const { subject, html, text } = buildReengagementEmail(firstName, APP_BASE_URL);

          const { error: sendError } = await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject,
            html,
            text,
          });

          if (sendError) {
            console.error(JSON.stringify({ event: "reengagement_send_failed", userId: user.id, code: sendError.name }));
          } else {
            await adminClient
              .from("profiles")
              .update({ last_reengagement_sent_at: new Date().toISOString() })
              .eq("id", user.id);
            console.log(JSON.stringify({ event: "reengagement_sent", userId: user.id }));
          }
        })
      )
    );

    return { contacted: usersToContact.length };
  }
);
```

### Service-role client pattern (from `lib/inngest/functions/retentionCleanup.ts`)

The `retentionCleanup` function uses `createClient as createSupabaseClient` from `@supabase/supabase-js` (not `@/utils/supabase/server`) with `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. Use the same pattern here — `checkInactivity` must read profiles and checkins across all users.

### Email template helper

```ts
export function buildReengagementEmail(firstName: string, appUrl: string) {
  return {
    subject: `Your streak is waiting, ${firstName}`,
    html: `
      <p>Hi ${firstName},</p>
      <p>We noticed you haven't checked in for a few days. Your goals are still here, waiting for you.</p>
      <p>Even a quick check-in helps you stay on track. It only takes a minute.</p>
      <p><a href="${appUrl}/checkin">Check in now →</a></p>
      <p>— Your LifePilot coach</p>
    `,
    text: `Hi ${firstName},\n\nWe noticed you haven't checked in for a few days. Your goals are still here, waiting for you.\n\nEven a quick check-in helps you stay on track. It only takes a minute.\n\nCheck in now: ${appUrl}/checkin\n\n— Your LifePilot coach`,
  };
}
```

### Profiles schema — important deviations from the task prompt

The `profiles` table in `supabase/migrations/002_profiles.sql` already has both columns:
- `last_reengagement_sent_at TIMESTAMPTZ` (nullable)
- `notification_preferences JSONB NOT NULL DEFAULT '{"briefingEmails": true, "reengagementEmails": true}'`

**The JSONB keys are camelCase** (`reengagementEmails`, `briefingEmails`) — not snake_case. All code must use camelCase keys consistently. The Supabase `.filter("notification_preferences->reengagementEmails", "eq", true)` query must match this casing.

The `profiles` table uses `name` (not `display_name`) — use `profile.name ?? "there"` as the `firstName` fallback.

### Migration file

```sql
-- supabase/migrations/007_add_reengagement_tracking.sql
-- Guard migration: ensures columns exist in environments where 002_profiles.sql
-- was applied before these columns were added.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_reengagement_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL
    DEFAULT '{"reengagementEmails": true, "briefingEmails": true}'::jsonb;
```

### Registering the function

```ts
// app/api/inngest/route.ts  (modified)
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { generateBriefing } from "@/lib/inngest/functions/generateBriefing";
import { retentionCleanup } from "@/lib/inngest/functions/retentionCleanup";
import { checkInactivity } from "@/lib/inngest/functions/checkInactivity";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBriefing, retentionCleanup, checkInactivity],
});
```

### Test patterns (from `lib/inngest/__tests__/generateBriefing.test.ts`)

The existing test file tests pipeline building blocks in isolation using `vi.mock()`. The `checkInactivity` tests should mock the service-role Supabase client and Resend, then test the core logic components (query filters, email template, update logic).

Required test cases for `lib/inngest/__tests__/checkInactivity.test.ts` (≥ 8 tests):

1. **Skips user with check-in in last 3 days** — `recentCheckin` is non-null; user not included in `usersToContact`
2. **Sends email to user with no check-in in last 3 days** — `recentCheckin` is null; `resend.emails.send` is called once
3. **Skips user with `reengagementEmails: false`** — profile filtered out by the Supabase query filter; no email sent
4. **Skips user who received re-engagement email < 3 days ago** — `last_reengagement_sent_at` is 1 day ago; filtered out by the rate limit query condition
5. **Sends to user whose last re-engagement was > 3 days ago** — `last_reengagement_sent_at` is 4 days ago; email sent
6. **Updates `last_reengagement_sent_at` after successful send** — `profiles.update` is called with `last_reengagement_sent_at` after Resend succeeds
7. **Uses "there" when `name` is null** — `buildReengagementEmail("there", appUrl)` used; subject is "Your streak is waiting, there"
8. **Fan-out: processes multiple inactive users** — two inactive profiles; `resend.emails.send` called twice; `profiles.update` called twice

Additional test: `buildReengagementEmail` produces correct subject, HTML, and plain-text for a given `firstName`.

Mock setup pattern:
```ts
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    update: vi.fn().mockReturnThis(),
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
  })),
}));

vi.mock("@/lib/email/resend", () => ({
  getResendClient: vi.fn(() => ({
    emails: { send: vi.fn().mockResolvedValue({ error: null }) },
  })),
}));
```

### Files to CREATE

```
lib/inngest/functions/checkInactivity.ts
lib/inngest/__tests__/checkInactivity.test.ts   (≥ 8 tests)
supabase/migrations/007_add_reengagement_tracking.sql
```

### Files to MODIFY

```
app/api/inngest/route.ts  — add checkInactivity import + register in functions array
```

### Files NOT to touch

```
lib/inngest/functions/generateBriefing.ts
lib/inngest/functions/retentionCleanup.ts
lib/inngest/client.ts
lib/email/resend.ts
utils/supabase/server.ts
supabase/migrations/002_profiles.sql
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(empty)

### Completion Notes List

- All 5 tasks complete. 341 tests passing (11 new).
- `checkInactivity` Inngest function: service-role client, cron trigger, `find-inactive-users` step with opt-in filter + rate limit filter + per-user check-in check, fan-out `step.run` per user, Resend email, conditional `last_reengagement_sent_at` update, structured logs.
- `buildReengagementEmail`: pure export with subject, html, text; CTA links to APP_BASE_URL/checkin; "there" fallback for null name.
- Guard migration: `ADD COLUMN IF NOT EXISTS` for `last_reengagement_sent_at` and `notification_preferences`.
- `checkInactivity` registered in Inngest route handler.
- 11 tests: 6 for `buildReengagementEmail` (pure), 5 for pipeline behavior via mock step execution.

### File List

- `lib/inngest/functions/checkInactivity.ts` — new
- `lib/inngest/__tests__/checkInactivity.test.ts` — new (11 tests)
- `supabase/migrations/007_add_reengagement_tracking.sql` — new
- `app/api/inngest/route.ts` — modified

### Change Log

- 2026-05-15: Story created — Sprint 5, Epic 5 Story 3; inactivity detection + re-engagement email via Inngest cron + Resend
