# Story 7.3: System-Wide Broadcast

Status: ready-for-dev

## Story

As a platform operator,
I want to send a system-wide announcement to all users via email,
So that I can communicate important platform updates, new features, or maintenance notices.

## Acceptance Criteria

**AC1 — Broadcast form UI:** Given I am on `/admin/broadcast`, when the form renders, then it shows a Subject field (max 120 chars) and a Body field (max 2,000 chars, plain text); both have visible character counters; a "Send broadcast" primary button submits the form.

**AC2 — POST /api/admin/broadcast:** Given I submit the broadcast form, when `POST /api/admin/broadcast` runs, then admin role is verified first; `AdminBroadcastSchema` Zod in `lib/validation/admin.ts` validates both fields; a `notification/broadcast.requested` Inngest event is emitted with `{ adminUserId, subject, body, triggeredAt }`; the route returns `{ data: { message: "Broadcast queued — users will receive it shortly." } }`.

**AC3 — sendBroadcast Inngest function:** Given the Inngest `sendBroadcast` function runs, when it fans out emails, then it fetches all user IDs with verified accounts and complete profiles; sends the broadcast email to each via Resend; the email includes a physical mailing address and one-click unsubscribe link (CAN-SPAM); users who have `broadcastEmails: false` in their notification preferences are skipped.

**AC4 — Success state:** Given the broadcast is queued, when the form submission response is received, then a `CoachVoiceLine` on the page reads "Broadcast queued — users will receive it shortly." and the form fields reset.

**AC5 — Audit log:** Given the broadcast completes, when the Inngest function finishes, then an `audit_logs` row is written with `event_type: 'admin_broadcast_sent'`, `user_id: adminUserId`, `metadata: { subject, recipientCount }` — no body content stored.

**AC6 — Access control:** Given `POST /api/admin/broadcast` is called without admin role, when the role check runs, then it returns HTTP 403: `{ "error": { "code": "FORBIDDEN", "message": "Admin access required." } }`.

## Tasks / Subtasks

- [ ] **Task 0: Migration — add broadcastEmails preference** (AC: #3)
  - [ ] Create `supabase/migrations/015_broadcast_preference.sql`
  - [ ] Update column default: `ALTER TABLE public.profiles ALTER COLUMN notification_preferences SET DEFAULT '{"briefingEmails": true, "reengagementEmails": true, "broadcastEmails": true}'::jsonb`
  - [ ] Backfill existing rows: `UPDATE public.profiles SET notification_preferences = notification_preferences || '{"broadcastEmails": true}'::jsonb WHERE notification_preferences->>'broadcastEmails' IS NULL`
  - [ ] Update `lib/validation/notificationPreferences.ts` — add `broadcastEmails: z.boolean().optional()` to the schema object
  - [ ] Update `app/api/unsubscribe/route.ts` — add `"broadcastEmails"` to `VALID_TYPES` array
  - [ ] Update `app/(app)/settings/page.tsx` — add `broadcastEmails: boolean` to `NotificationPreferences` interface and `DEFAULTS`, add a third `ToggleRow` (id: `"toggle-broadcast"`, label: `"Platform announcements"`, description: `"Important updates about LifePilot — features, maintenance, and security notices"`)

- [ ] **Task 1: Extend AdminBroadcastSchema in lib/validation/admin.ts** (AC: #2)
  - [ ] Add `AdminBroadcastSchema` with `subject: z.string().min(1).max(120)` and `body: z.string().min(1).max(2000)`
  - [ ] Export `AdminBroadcastInput = z.infer<typeof AdminBroadcastSchema>`
  - [ ] Write failing tests in `lib/validation/__tests__/admin.test.ts` for the new schema (valid, too-long subject, too-long body, empty fields)
  - [ ] Tests pass

- [ ] **Task 2: broadcast email template** (AC: #3)
  - [ ] Create `lib/email/templates/broadcast.ts`
  - [ ] Export `buildBroadcastEmail(subject: string, body: string, unsubscribeUrl?: string): { subject, html, text }`
  - [ ] HTML body: render plain text paragraphs (split by `\n`), no AI disclosure (admin-authored content)
  - [ ] Footer: CAN-SPAM physical address (`process.env.COMPANY_MAILING_ADDRESS ?? "LifePilot, 123 Main St, San Francisco CA 94105"`) + unsubscribe link
  - [ ] Follow same HTML style as `lib/email/templates/briefing.ts` (max-width 600px, system-ui font)

- [ ] **Task 3: POST /api/admin/broadcast route** (AC: #2, #6)
  - [ ] Write failing tests first: `app/api/admin/__tests__/broadcast.test.ts`
    - [ ] 500 CONFIG_ERROR when `SUPABASE_SERVICE_ROLE_KEY` absent
    - [ ] 401 when unauthenticated
    - [ ] 400 VALIDATION_ERROR when subject is empty
    - [ ] 400 VALIDATION_ERROR when subject exceeds 120 chars
    - [ ] 400 VALIDATION_ERROR when body is empty
    - [ ] 400 VALIDATION_ERROR when body exceeds 2000 chars
    - [ ] 400 VALIDATION_ERROR before role DB query (no `mockAdminFrom` calls for invalid body)
    - [ ] 500 DB_ERROR when role check query fails
    - [ ] 403 FORBIDDEN when role is not admin
    - [ ] 200 success with correct message when admin submits valid payload
    - [ ] inngest.send() called with `notification/broadcast.requested` and correct payload
    - [ ] Structured log emitted on success with no body content
  - [ ] Create `app/api/admin/broadcast/route.ts`
  - [ ] Call order: env check → auth (JWT) → body parse + validation → role DB check → inngest.send() → 200
  - [ ] Run tests — all pass

- [ ] **Task 4: sendBroadcast Inngest function** (AC: #3, #5)
  - [ ] Write failing tests: `lib/inngest/__tests__/sendBroadcast.test.ts`
    - [ ] Fetches profiles with `notification_preferences->reengagementEmails` eq true only
    - [ ] Skips users whose `email_confirmed_at` is null (unverified accounts)
    - [ ] Sends email via Resend with correct subject and from address
    - [ ] Each per-user step includes unsubscribe URL using `generateUnsubscribeToken(userId, "reengagementEmails")`
    - [ ] Audit log written at end with `event_type: 'admin_broadcast_sent'` and no body in metadata
    - [ ] Structured log at completion with `recipientCount` and `subject` (no body)
    - [ ] Returns `{ recipientCount: N }`
  - [ ] Create `lib/inngest/functions/sendBroadcast.ts`
  - [ ] Step 1 ("find-recipients"): query profiles, filter by `reengagementEmails: true`
  - [ ] Step 2 (per-user fan-out): `Promise.all(recipients.map(r => step.run(\`send-broadcast-${r.id}\`, ...)))`
  - [ ] Inside each per-user step: call `auth.admin.getUserById()`, skip if no email or not confirmed, send via Resend
  - [ ] Final step: write audit log (fire-and-forget `.then().catch()`)
  - [ ] Register `sendBroadcast` in `app/api/inngest/route.ts`
  - [ ] Run tests — all pass

- [ ] **Task 5: BroadcastForm client component** (AC: #1, #4)
  - [ ] Create `app/admin/broadcast/BroadcastForm.tsx` as `"use client"` component
  - [ ] Subject textarea/input with `onChange` → character counter `{subject.length}/120`, `maxLength={120}`
  - [ ] Body textarea with `onChange` → character counter `{body.length}/2000`, `maxLength={2000}`
  - [ ] On submit: `fetch("/api/admin/broadcast", { method: "POST", body: JSON.stringify({ subject, body }) })`
  - [ ] On success: render `<CoachVoiceLine>` with success message, reset both fields to `""`
  - [ ] On error: show `result.error?.message` in destructive text
  - [ ] "Send broadcast" button disabled during submission (show "Sending…" label)
  - [ ] Import `CoachVoiceLine` from `@/components/ui/coach-voice-line`

- [ ] **Task 6: /admin/broadcast RSC page + loading skeleton** (AC: #1, #4)
  - [ ] Create `app/admin/broadcast/page.tsx` — thin RSC wrapper that renders `<BroadcastForm />`
  - [ ] Create `app/admin/broadcast/loading.tsx` — skeleton placeholder for the form area

- [ ] **Task 7: Run full test suite**
  - [ ] `npx vitest run` — all existing 445 tests still pass, new tests pass
  - [ ] No regressions

## Dev Notes

### Architecture location map

```
supabase/migrations/
  015_broadcast_preference.sql  ← NEW (Task 0) — broadcastEmails default + backfill
app/
  (app)/
    settings/
      page.tsx              ← UPDATE (Task 0) — add broadcastEmails toggle
  admin/
    layout.tsx              ← EXISTS — wraps all admin pages, handles role guard
    page.tsx                ← EXISTS — metrics dashboard
    users/
      page.tsx              ← EXISTS — user lookup
    broadcast/
      page.tsx              ← NEW (Task 6)
      BroadcastForm.tsx     ← NEW (Task 5) — "use client"
      loading.tsx           ← NEW (Task 6)
app/api/
  admin/
    metrics/route.ts        ← EXISTS
    users/route.ts          ← EXISTS
    broadcast/route.ts      ← NEW (Task 3)
  inngest/
    route.ts                ← UPDATE (Task 4) — register sendBroadcast
  unsubscribe/
    route.ts                ← UPDATE (Task 0) — add "broadcastEmails" to VALID_TYPES
lib/
  admin/
    getMetrics.ts           ← EXISTS
    getUserData.ts          ← EXISTS
  validation/
    admin.ts                ← UPDATE (Task 1) — add AdminBroadcastSchema
    notificationPreferences.ts ← UPDATE (Task 0) — add broadcastEmails field
    __tests__/admin.test.ts ← UPDATE (Task 1)
  inngest/
    client.ts               ← EXISTS — do not modify
    functions/
      sendBroadcast.ts      ← NEW (Task 4)
    __tests__/
      sendBroadcast.test.ts ← NEW (Task 4)
  email/
    resend.ts               ← EXISTS — use getResendClient()
    unsubscribe.ts          ← EXISTS — use generateUnsubscribeToken()
    templates/
      broadcast.ts          ← NEW (Task 2)
app/api/
  admin/
    __tests__/
      broadcast.test.ts     ← NEW (Task 3)
```

### CRITICAL: Admin role guard is in layout.tsx — route.ts must also check

`app/admin/layout.tsx` already guards all pages under `/admin/` — but `POST /api/admin/broadcast` is a separate serverless function with NO layout involvement. The route must independently verify admin role. This pattern is identical to `app/api/admin/metrics/route.ts` and `app/api/admin/users/route.ts`.

### CRITICAL: lib/validation/admin.ts — UPDATE, do not replace

Current content of `lib/validation/admin.ts`:
```ts
import { z } from "zod";

export const AdminUserLookupSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

export type AdminUserLookupInput = z.infer<typeof AdminUserLookupSchema>;
```

**You must ADD to this file without removing or renaming existing exports** — `AdminUserLookupSchema` and `AdminUserLookupInput` are imported by `lib/admin/getUserData.ts` and `app/api/admin/users/route.ts`. Removing them breaks those modules.

Add after the existing exports:
```ts
export const AdminBroadcastSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(120, "Subject must be 120 characters or fewer"),
  body: z.string().min(1, "Body is required").max(2000, "Body must be 2,000 characters or fewer"),
});

export type AdminBroadcastInput = z.infer<typeof AdminBroadcastSchema>;
```

### CRITICAL: app/api/inngest/route.ts — UPDATE, do not replace

Current content:
```ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { generateBriefing } from "@/lib/inngest/functions/generateBriefing";
import { retentionCleanup } from "@/lib/inngest/functions/retentionCleanup";
import { checkInactivity } from "@/lib/inngest/functions/checkInactivity";
import { exportUserData } from "@/lib/inngest/functions/exportUserData";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBriefing, retentionCleanup, checkInactivity, exportUserData],
});
```

**Add the import and the function to the array**:
```ts
import { sendBroadcast } from "@/lib/inngest/functions/sendBroadcast";
// ...
functions: [generateBriefing, retentionCleanup, checkInactivity, exportUserData, sendBroadcast],
```

### Admin route handler pattern (copy exactly from existing routes)

All admin routes follow this exact order — **do not deviate**:

```ts
// 1. Env var guard
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) return 500 CONFIG_ERROR

// 2. Session auth (JWT only, no DB)
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) return 401 UNAUTHORIZED

// 3. Input validation — BEFORE role DB query (P5 lesson from Story 7.2)
const parsed = AdminBroadcastSchema.safeParse(body);
if (!parsed.success) return 400 VALIDATION_ERROR  // no DB call yet

// 4. Role check (DB)
const adminClient = createSupabaseClient(SUPABASE_URL, serviceRoleKey);
const { data: profile, error: profileError } = await adminClient
  .from("profiles").select("role").eq("id", user.id).single();
if (profileError) return 500 DB_ERROR
if (profile?.role !== "admin") return 403 FORBIDDEN

// 5. Business logic
await inngest.send({ name: "notification/broadcast.requested", data: { ... } });

// 6. Structured log (no body content in log)
console.log(JSON.stringify({ event: "admin_broadcast_queued", adminUserId: user.id, subject }));

return 200 { data: { message: "..." } }
```

### P5 lesson from Story 7.2: validate input BEFORE role DB query

In Story 7.2, a code review patch (P5) moved UUID validation to happen before the `profiles.role` DB query — so invalid input returns 400 without hitting the database. Apply the same here: parse and validate the request body before querying for admin role.

### Inngest function pattern — follow checkInactivity.ts exactly

Full pattern from `lib/inngest/functions/checkInactivity.ts`:

```ts
export const sendBroadcast = inngest.createFunction(
  { id: "send-broadcast", name: "Send System-Wide Broadcast", retries: 3 },
  { event: "notification/broadcast.requested" },
  async ({ event, step }) => {
    const { adminUserId, subject, body } = event.data;

    // Step 1: Find recipients
    const recipients = await step.run("find-recipients", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: profiles, error } = await adminClient
        .from("profiles")
        .select("id")
        .filter("notification_preferences->broadcastEmails", "eq", true);
      if (error) throw new Error(`Failed to fetch recipients: ${error.message}`);
      return profiles ?? [];
    });

    // Step 2: Fan-out sends (parallel, one step.run per user)
    await Promise.all(
      recipients.map((profile) =>
        step.run(`send-broadcast-${profile.id}`, async () => {
          const adminClient = createSupabaseClient(...);
          const resend = getResendClient();

          // Get email + verify confirmed (like checkInactivity.ts)
          const authResult = await adminClient.auth.admin.getUserById(profile.id)
            .catch(() => ({ data: null }));
          const userEmail = (authResult as any)?.data?.user?.email;
          const emailConfirmed = (authResult as any)?.data?.user?.email_confirmed_at;

          if (!userEmail || !emailConfirmed) {
            console.log(JSON.stringify({ event: "broadcast_skip_unverified", userId: profile.id }));
            return;
          }

          const unsubToken = generateUnsubscribeToken(profile.id, "broadcastEmails");
          const unsubUrl = `${APP_BASE_URL}/api/unsubscribe?token=${unsubToken}&userId=${profile.id}&type=broadcastEmails`;
          const { subject: emailSubject, html, text } = buildBroadcastEmail(subject, body, unsubUrl);

          const { error: sendError } = await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject: emailSubject,
            html,
            text,
          });

          if (sendError) {
            console.error(JSON.stringify({ event: "broadcast_send_failed", userId: profile.id }));
          } else {
            console.log(JSON.stringify({ event: "broadcast_sent", userId: profile.id }));
          }
        })
      )
    );

    // Audit log (fire-and-forget, no body in metadata)
    const adminClient = createSupabaseClient(...);
    adminClient
      .from("audit_logs")
      .insert({ user_id: adminUserId, event_type: "admin_broadcast_sent", metadata: { subject, recipientCount: recipients.length } })
      .then(({ error }: { error: { code: string } | null }) => {
        if (error) console.error(JSON.stringify({ event: "audit_log_error", code: error.code }));
      })
      .catch((err: Error) => {
        console.error(JSON.stringify({ event: "audit_log_error", message: err.message }));
      });

    console.log(JSON.stringify({ event: "admin_broadcast_complete", recipientCount: recipients.length, subject }));
    return { recipientCount: recipients.length };
  }
);
```

### Notification preferences — broadcastEmails is a dedicated opt-out (Option B)

Story 7.3 introduces a **new `broadcastEmails` preference type** to allow granular control: users can silence re-engagement nudges without losing platform announcements, and vice versa.

**Migration 015** (Task 0):
- Updates the `notification_preferences` column default to include `"broadcastEmails": true`
- Backfills existing rows so no existing user is unexpectedly opted out
- After migration, all three preferences are first-class: `briefingEmails`, `reengagementEmails`, `broadcastEmails`

**Filter in sendBroadcast**: `.filter("notification_preferences->broadcastEmails", "eq", true)`

**Unsubscribe link in broadcast email**: `type=broadcastEmails` — clicking sets `broadcastEmails: false` via the unsubscribe route.

**Files touched by Task 0:**

1. `lib/validation/notificationPreferences.ts` — current content:
```ts
export const NotificationPreferencesSchema = z
  .object({
    briefingEmails: z.boolean().optional(),
    reengagementEmails: z.boolean().optional(),
  })
  .refine(
    (v) => v.briefingEmails !== undefined || v.reengagementEmails !== undefined,
    { message: "At least one preference key must be provided." }
  );
```
Add `broadcastEmails: z.boolean().optional()` to the `.object({...})` block AND update the `.refine()` condition to also accept `broadcastEmails !== undefined`.

2. `app/api/unsubscribe/route.ts` — current VALID_TYPES:
```ts
const VALID_TYPES = ["briefingEmails", "reengagementEmails"] as const;
```
Add `"broadcastEmails"`:
```ts
const VALID_TYPES = ["briefingEmails", "reengagementEmails", "broadcastEmails"] as const;
```

3. `app/(app)/settings/page.tsx` — current `NotificationPreferences` interface has `briefingEmails` and `reengagementEmails`. Add `broadcastEmails: boolean` to the interface and `DEFAULTS`, add a third `ToggleRow`:
```tsx
<ToggleRow
  id="toggle-broadcast"
  label="Platform announcements"
  description="Important updates about LifePilot — features, maintenance, and security notices"
  checked={prefs.broadcastEmails}
  onChange={(v) => handleToggle("broadcastEmails", v)}
/>
```
Also add a third `<SkeletonToggleRow />` in the loading branch (currently renders two).

### CoachVoiceLine component — already exists

```ts
// app/admin/broadcast/BroadcastForm.tsx
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

// Usage (variant "closing" centers it):
<CoachVoiceLine variant="closing">
  Broadcast queued — users will receive it shortly.
</CoachVoiceLine>
```

Signature: `CoachVoiceLine({ children, variant?: "opening"|"closing"|"empty"|"observation", className? })`

### Email template — CAN-SPAM requirements

The broadcast email MUST include:
1. A physical mailing address (CAN-SPAM §5a): use `process.env.COMPANY_MAILING_ADDRESS ?? "LifePilot, 548 Market St, San Francisco CA 94104"`
2. A clear one-click unsubscribe mechanism in the email footer

The email does NOT need the `✦ AI-generated` disclosure — that's only for LLM-generated briefing content. This is admin-authored plain text.

Follow the HTML structure of `lib/email/templates/briefing.ts`:
- `max-width: 600px`, `margin: 0 auto`, `padding: 32px 24px`
- Body font: `system-ui, sans-serif`
- Split the plain-text `body` by `\n` and render each line as a `<p>` in HTML (skip empty lines or render as spacing)
- Footer: small grey text with physical address + unsubscribe link

### BroadcastForm client component — character counter pattern

Character counters need client-side `useState`. The form submits to the API route via `fetch()` (not a native form POST) so the success message and field reset can happen without a page navigation.

```tsx
"use client";
import { useState } from "react";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

export function BroadcastForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      if (res.ok) {
        setStatus("success");
        setSubject("");
        setBody("");
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMessage(data?.error?.message ?? "Failed to send broadcast. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      <div>
        <div className="flex justify-between mb-1">
          <label htmlFor="subject" className="text-sm font-medium">Subject</label>
          <span className="text-xs text-muted-foreground">{subject.length}/120</span>
        </div>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <label htmlFor="body" className="text-sm font-medium">Body</label>
          <span className="text-xs text-muted-foreground">{body.length}/2000</span>
        </div>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          required
          rows={8}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>
      {status === "error" && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      {status === "success" && (
        <CoachVoiceLine variant="closing">
          Broadcast queued — users will receive it shortly.
        </CoachVoiceLine>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Send broadcast"}
      </button>
    </form>
  );
}
```

### Inngest client.ts — how to call inngest.send()

```ts
// lib/inngest/client.ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "lifepilot" });
```

In the route handler, import and call:
```ts
import { inngest } from "@/lib/inngest/client";
await inngest.send({
  name: "notification/broadcast.requested",
  data: { adminUserId: user.id, subject, body: broadcastBody, triggeredAt: new Date().toISOString() },
});
```

### Test patterns — how to mock inngest.send()

Follow the metrics route test pattern for the route handler test. For inngest:
```ts
const mockInngestSend = vi.fn().mockResolvedValue({ ids: ["evt_123"] });

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: mockInngestSend },
}));
```

For the Inngest function test, follow `lib/inngest/__tests__/checkInactivity.test.ts` for the mock structure.

### Error response format — match existing API routes exactly

```ts
// 400
{ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } }

// 401
{ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }

// 403
{ error: { code: "FORBIDDEN", message: "Admin access required." } }

// 500
{ error: { code: "CONFIG_ERROR" | "DB_ERROR", message: "..." } }

// 200
{ data: { message: "Broadcast queued — users will receive it shortly." } }
```

### Previous story learnings (Stories 7.1 + 7.2 patches — must apply)

- **Zod v4 uses `.issues` not `.errors`**: `parsed.error.issues[0]?.message` — confirmed in lib/validation/admin.ts existing usage
- **Validate input BEFORE role DB query** (P5 from 7.2): parse body, return 400 before querying `profiles`
- **Check all DB errors explicitly** (P1 from 7.2): don't silently swallow errors from any query
- **Fire-and-forget audit log with `.then().catch()`** (P3 from 7.2): consistent pattern in all admin routes
- **No body content in audit log**: only `subject` and `recipientCount` in metadata
- **Structured logs with no PII**: `adminUserId` (UUID) is ok, but no email addresses, names, or broadcast body text in logs

### Test baseline

Current: **445 tests passing** across 49 test files. The full test suite must pass after implementation with new tests added on top.

### Inngest test infrastructure — reference checkInactivity pattern

```ts
// lib/inngest/__tests__/checkInactivity.test.ts pattern:
const mockStep = {
  run: vi.fn().mockImplementation(async (_name: string, fn: () => Promise<unknown>) => fn()),
};
const mockEvent = {
  data: { adminUserId: "admin-id", subject: "Test", body: "Hello", triggeredAt: "2026-06-13T00:00:00Z" },
};
// Test: const result = await sendBroadcast.handler({ event: mockEvent, step: mockStep });
```

Look at how `lib/inngest/__tests__/checkInactivity.test.ts` mocks `@supabase/supabase-js`, `getResendClient`, and `generateUnsubscribeToken` — replicate that pattern exactly.

## Dev Agent Record

### Status
ready-for-dev

### Completion Notes
Story context created 2026-06-13. Comprehensive dev notes written covering all files, patterns, and gotchas from Epic 7 prior stories.

### File List
_(to be filled in by dev agent)_

### Change Log
- Story 7.3 created (ready-for-dev) — 2026-06-13
