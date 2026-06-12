# Story 6.1: Personal Data Export

Status: done

## Story

As a signed-in user,
I want to export all my personal data in a machine-readable format,
So that I can access a complete copy of everything LifePilot holds about me.

## Acceptance Criteria

**AC1 — Request export UI:** Given I navigate to `/data`, when the page loads, then a page with heading "Your data" is shown with a "Request data export" button and a brief explanation: "We'll prepare a full copy of your data and email you a download link within a few minutes."

**AC2 — POST /api/export:** Given an authenticated POST to `/api/export`, when the handler runs, then it: verifies the user session (401 if not authenticated); emits an Inngest event `{ name: "export/data.requested", data: { userId, triggeredAt } }`; writes an `audit_logs` row `{ user_id, event_type: "data_export_requested" }`; returns `{ data: { message: "Your export is being prepared — you'll receive an email when it's ready." } }`. Unauthenticated → 401.

**AC3 — exportUserData Inngest function:** Given the `exportUserData` function receives an `export/data.requested` event, when it runs, then it fetches using the service-role Supabase client: profile row (by `id = userId`), all goals (by `user_id = userId`, all statuses), all checkins (by `user_id = userId`), all briefings (by `user_id = userId`), and audit_logs (by `user_id = userId`); then assembles `{ exportedAt, profile, goals, checkins, briefings, auditLog }` and uploads it as JSON to Supabase Storage bucket `exports` at path `exports/{userId}/{timestamp}.json`.

**AC4 — Signed URL email:** Given the file is uploaded, when the Inngest function sends the email, then it fetches the user's email via `adminClient.auth.admin.getUserById(userId)`; generates a signed URL with 1-hour expiry via `adminClient.storage.from("exports").createSignedUrl(path, 3600)`; sends via `getResendClient()` using the template from `lib/email/templates/dataExport.ts` with subject "Your LifePilot data export is ready"; the email contains a "Download your data" CTA button with the signed URL; a plain-text alternative is included; this email is critical and bypasses `notification_preferences`.

**AC5 — Structured logging:** Given the function completes, when it logs, then it emits `{ event: "data_export_generated", userId, fileSizeBytes }` — no personal data or email address in log fields. On Resend error: `{ event: "data_export_email_failed", userId, code }`.

**AC6 — Supabase Storage migration:** A migration `008_storage_exports_bucket.sql` creates the private `exports` bucket and adds a storage RLS policy: SELECT allowed where `auth.uid()::text = (storage.foldername(name))[1]` (i.e. the first path segment is the userId).

## Tasks / Subtasks

- [x] **Task 1 — Storage migration** (AC: #6)
  - [x] Create `supabase/migrations/008_storage_exports_bucket.sql`
  - [x] Insert into `storage.buckets` with `public = false`, `ON CONFLICT DO NOTHING`
  - [x] Add RLS policy on `storage.objects` for SELECT: `bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]`

- [x] **Task 2 — Email template** (AC: #4)
  - [x] Create `lib/email/templates/dataExport.ts`
  - [x] Export `interface DataExportEmailContext { userName: string; downloadUrl: string; appBaseUrl: string }`
  - [x] Export `buildDataExportEmail(ctx: DataExportEmailContext): { subject, html, text }`
  - [x] Subject: `"Your LifePilot data export is ready"`
  - [x] HTML: greeting paragraph, brief explanation ("Your data export is ready to download"), CTA button `<a href="${downloadUrl}">Download your data</a>` (styled like briefing CTA — `background:#46876A`), expiry notice "This link expires in 1 hour.", `<hr>` + AI disclaimer footer
  - [x] Plain-text: same content, CTA as full URL

- [x] **Task 3 — exportUserData Inngest function** (AC: #3, #4, #5)
  - [x] Create `lib/inngest/functions/exportUserData.ts`
  - [x] Register as event-triggered: `triggers: [{ event: "export/data.requested" }]`, `retries: 3`
  - [x] `step.run("fetch-user-data")`: use service-role client (`createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY`); run 5 parallel queries via `Promise.all`: profile (`.eq("id", userId)`), goals (`.eq("user_id", userId)`), checkins (`.eq("user_id", userId).order("checked_in_at", { ascending: false })`), briefings (`.eq("user_id", userId).order("briefing_date", { ascending: false })`), auditLog (`.eq("user_id", userId).order("created_at", { ascending: false })`); assemble `{ exportedAt: new Date().toISOString(), profile, goals, checkins, briefings, auditLog }`
  - [x] `step.run("upload-export")`: serialize to JSON string; upload via `adminClient.storage.from("exports").upload(path, Buffer.from(jsonString), { contentType: "application/json", upsert: true })`; path = `` `exports/${userId}/${timestamp}.json` `` where timestamp = `new Date().toISOString().replace(/[:.]/g, "-")`; throw on upload error
  - [x] `step.run("send-email")`: `adminClient.auth.admin.getUserById(userId)` → get email; `adminClient.storage.from("exports").createSignedUrl(path, 3600)` → get signed URL; `buildDataExportEmail({ userName, downloadUrl, appBaseUrl: APP_BASE_URL })`; send via `getResendClient()`; log `{ event: "data_export_generated", userId, fileSizeBytes: Buffer.byteLength(jsonString) }` on success; log `{ event: "data_export_email_failed", userId, code }` on Resend error (do not throw — export is complete even if email fails)
  - [x] **Critical:** `profile` uses `id` as PK (not `user_id`) — query `profiles` with `.eq("id", userId)`. All other tables use `user_id`.

- [x] **Task 4 — POST /api/export route** (AC: #2)
  - [x] Create `app/api/export/route.ts`
  - [x] Auth guard: 401 if no session
  - [x] Emit Inngest event: `await inngest.send({ name: "export/data.requested", data: { userId: user.id, triggeredAt: new Date().toISOString() } })`
  - [x] Insert audit log: `supabase.from("audit_logs").insert({ user_id: user.id, event_type: "data_export_requested" })`
  - [x] Return `{ data: { message: "Your export is being prepared — you'll receive an email when it's ready." } }`
  - [x] DB error on audit log → log it but do NOT block the response (best-effort audit)

- [x] **Task 5 — Register exportUserData in Inngest route** (AC: #3)
  - [x] Import `exportUserData` in `app/api/inngest/route.ts`
  - [x] Add to the `functions` array

- [x] **Task 6 — /data page UI** (AC: #1)
  - [x] Create `app/(app)/data/page.tsx` as `"use client"` component
  - [x] State: `status: "idle" | "loading" | "success" | "error"`, `errorMessage: string`
  - [x] Page heading "Your data", subheading explanation text
  - [x] Button "Request data export" — calls `fetch("/api/export", { method: "POST" })` on click; while pending shows spinner or disabled state; on success shows `CoachVoiceLine` confirmation "Your export is being prepared — you'll receive an email when it's ready."; on error shows amber error banner (same `role="alert"` pattern as goals page)
  - [x] `/data` already present in `PROTECTED_ROUTES` in `proxy.ts`

- [x] **Task 7 — Tests** (AC: #1–#5)
  - [x] Create `app/api/export/__tests__/export.test.ts` — 6 tests: 401 unauthenticated, 401 when user null, emits Inngest event, inserts audit log, returns correct message, audit log failure does not block response
  - [x] Create `lib/email/__tests__/dataExport.test.ts` — 7 tests: correct subject, CTA URL in HTML, CTA URL in text, returns all three parts, userName in both, expiry notice, data page link
  - [x] Create `lib/inngest/__tests__/exportUserData.test.ts` — 8 tests: fetches 5 data types, uploads to correct path, generates signed URL, sends email with download URL, logs structured event, email failure does not throw, user not found does not throw, upload failure throws
  - [ ] Create `lib/inngest/__tests__/exportUserData.test.ts` — ≥ 6 tests: fetches all 5 data types and assembles correctly, uploads to correct path, generates signed URL, sends email with download button, logs correct structured event, email failure does not throw (export is considered complete)

## Dev Notes

### Critical schema distinction — profiles vs other tables

`profiles` table PK is **`id`** (= `auth.users.id`). Do NOT use `user_id`.
All other tables (`goals`, `checkins`, `briefings`, `audit_logs`) use **`user_id`** as the FK column.

```ts
// CORRECT
supabase.from("profiles").select("*").eq("id", userId)
supabase.from("goals").select("*").eq("user_id", userId)
supabase.from("checkins").select("*").eq("user_id", userId)
supabase.from("briefings").select("*").eq("user_id", userId)
supabase.from("audit_logs").select("*").eq("user_id", userId)
```

### Inngest event trigger (from `lib/inngest/client.ts`)

```ts
// lib/inngest/client.ts — existing
export const inngest = new Inngest({ id: "lifepilot" });

// POST /api/export — emit event
import { inngest } from "@/lib/inngest/client";
await inngest.send({
  name: "export/data.requested",
  data: { userId: user.id, triggeredAt: new Date().toISOString() },
});
```

### exportUserData Inngest function pattern

```ts
// lib/inngest/functions/exportUserData.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { getResendClient } from "@/lib/email/resend";
import { buildDataExportEmail } from "@/lib/email/templates/dataExport";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lifepilot.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "briefing@lifepilot.app";

export const exportUserData = inngest.createFunction(
  { id: "export-user-data", name: "Export User Data", retries: 3, triggers: [{ event: "export/data.requested" }] },
  async ({ event, step }) => {
    const userId = event.data.userId as string;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `exports/${userId}/${timestamp}.json`;

    const { jsonString } = await step.run("fetch-user-data", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const [profileRes, goalsRes, checkinsRes, briefingsRes, auditRes] = await Promise.all([
        adminClient.from("profiles").select("*").eq("id", userId).single(),
        adminClient.from("goals").select("*").eq("user_id", userId),
        adminClient.from("checkins").select("*").eq("user_id", userId).order("checked_in_at", { ascending: false }),
        adminClient.from("briefings").select("*").eq("user_id", userId).order("briefing_date", { ascending: false }),
        adminClient.from("audit_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        profile: profileRes.data,
        goals: goalsRes.data ?? [],
        checkins: checkinsRes.data ?? [],
        briefings: briefingsRes.data ?? [],
        auditLog: auditRes.data ?? [],
      };
      return { jsonString: JSON.stringify(exportPayload, null, 2) };
    });

    await step.run("upload-export", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error } = await adminClient.storage
        .from("exports")
        .upload(path, Buffer.from(jsonString), { contentType: "application/json", upsert: true });
      if (error) throw new Error(`Storage upload failed: ${error.message}`);
    });

    await step.run("send-email", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const resend = getResendClient();

      const { data: authUser } = await adminClient.auth.admin.getUserById(userId).catch(() => ({ data: null }));
      const userEmail = (authUser as { user?: { email?: string; user_metadata?: { name?: string } } } | null)?.user?.email;
      const userName = (authUser as { user?: { user_metadata?: { name?: string } } } | null)?.user?.user_metadata?.name ?? "there";

      if (!userEmail) {
        console.error(JSON.stringify({ event: "data_export_email_failed", userId, code: "NO_EMAIL" }));
        return;
      }

      const { data: signedData, error: signedError } = await adminClient.storage
        .from("exports")
        .createSignedUrl(path, 3600);

      if (signedError || !signedData?.signedUrl) {
        console.error(JSON.stringify({ event: "data_export_email_failed", userId, code: "SIGNED_URL_FAILED" }));
        return;
      }

      const { subject, html, text } = buildDataExportEmail({
        userName,
        downloadUrl: signedData.signedUrl,
        appBaseUrl: APP_BASE_URL,
      });

      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject,
        html,
        text,
      });

      if (sendError) {
        console.error(JSON.stringify({ event: "data_export_email_failed", userId, code: (sendError as { name?: string }).name ?? "UNKNOWN" }));
      } else {
        console.log(JSON.stringify({ event: "data_export_generated", userId, fileSizeBytes: Buffer.byteLength(jsonString) }));
      }
    });

    return { path };
  }
);
```

### POST /api/export route pattern

```ts
// app/api/export/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  // Emit Inngest event (this triggers exportUserData)
  await inngest.send({
    name: "export/data.requested",
    data: { userId: user.id, triggeredAt: new Date().toISOString() },
  });

  // Best-effort audit log — do not block response on DB error
  await supabase
    .from("audit_logs")
    .insert({ user_id: user.id, event_type: "data_export_requested" })
    .then(({ error }) => {
      if (error) console.error(JSON.stringify({ event: "audit_log_failed", userId: user.id, code: error.code }));
    });

  return NextResponse.json({
    data: { message: "Your export is being prepared — you'll receive an email when it's ready." },
  });
}
```

### Email template pattern (from `lib/email/templates/briefing.ts`)

```ts
// lib/email/templates/dataExport.ts
export interface DataExportEmailContext {
  userName: string;
  downloadUrl: string;
  appBaseUrl: string;
}

export function buildDataExportEmail(ctx: DataExportEmailContext): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Your LifePilot data export is ready",
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF9F6;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <p style="font-family:Georgia,serif;font-size:20px;line-height:1.7;color:#2D3142;font-style:italic;margin:0 0 24px;">Hi ${ctx.userName},</p>
  <p style="font-size:16px;color:#2D3142;margin:0 0 16px;">Your LifePilot data export is ready to download. It includes your profile, goals, check-ins, briefings, and activity log.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${ctx.downloadUrl}" style="display:inline-block;background:#46876A;color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Download your data</a>
  </div>
  <p style="font-size:14px;color:#888;margin:0 0 24px;">This link expires in 1 hour. If it has expired, you can request a new export from your <a href="${ctx.appBaseUrl}/data" style="color:#46876A;">data page</a>.</p>
  <hr style="border:none;border-top:1px solid #E5E0D8;margin:24px 0;">
  <p style="font-size:12px;color:#888;margin:0;">LifePilot — your personal AI coach</p>
</div>
</body>
</html>`,
    text: `Hi ${ctx.userName},\n\nYour LifePilot data export is ready.\n\nDownload your data: ${ctx.downloadUrl}\n\nThis link expires in 1 hour. If it has expired, request a new export at: ${ctx.appBaseUrl}/data\n\n— LifePilot`,
  };
}
```

### Storage migration pattern

```sql
-- supabase/migrations/008_storage_exports_bucket.sql
-- Creates private exports bucket for GDPR data export files (Story 6.1)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can only download their own export files
-- The first path segment (foldername[1]) is the userId
CREATE POLICY "Users can read their own exports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Registering exportUserData in the Inngest route

```ts
// app/api/inngest/route.ts — add to existing file
import { exportUserData } from "@/lib/inngest/functions/exportUserData";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBriefing, retentionCleanup, checkInactivity, exportUserData],
});
```

### /data page pattern

```tsx
// app/(app)/data/page.tsx — "use client"
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

type Status = "idle" | "loading" | "success" | "error";

export default function DataPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleExport() {
    setStatus("loading");
    setErrorMessage("");
    const res = await fetch("/api/export", { method: "POST" });
    if (res.ok) {
      setStatus("success");
    } else {
      const json = await res.json().catch(() => ({}));
      setErrorMessage((json as { error?: { message?: string } })?.error?.message ?? "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold mb-2">Your data</h1>
      <p className="text-sm text-muted-foreground mb-8">
        You can request a full copy of all the data LifePilot holds about you, including your profile, goals, check-ins, and briefings.
      </p>

      {status === "success" ? (
        <CoachVoiceLine variant="closing">
          Your export is being prepared — you'll receive an email when it's ready.
        </CoachVoiceLine>
      ) : (
        <>
          {status === "error" && (
            <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6">
              {errorMessage}
            </div>
          )}
          <Button onClick={handleExport} disabled={status === "loading"}>
            {status === "loading" ? "Requesting…" : "Request data export"}
          </Button>
        </>
      )}
    </div>
  );
}
```

### proxy.ts update required

Add `/data` to `PROTECTED_ROUTES` in `proxy.ts`:
```ts
const PROTECTED_ROUTES = ["/dashboard", "/onboarding", "/checkin", "/goals", "/briefing", "/profile", "/settings", "/data"];
```

### Auth pattern (from `app/api/goals/route.ts`)

```ts
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
}
```

### Test mock patterns

For `exportUserData` tests — mock the admin Supabase client and storage:
```ts
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      order: vi.fn().mockReturnThis(),
      // for non-single queries, resolve directly:
      then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(fn),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url/file.json" }, error: null }),
      }),
    },
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: { email: "user@example.com", user_metadata: { name: "Alice" } } } }),
      },
    },
  })),
}));

vi.mock("@/lib/email/resend", () => ({
  getResendClient: vi.fn(() => ({ emails: { send: vi.fn().mockResolvedValue({ error: null }) } })),
}));

vi.mock("../client", () => ({
  inngest: { createFunction: vi.fn((config, fn) => ({ config, fn })) },
}));
```

For `POST /api/export` tests — mock `inngest.send`:
```ts
vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));
```

### Files to CREATE

```
supabase/migrations/008_storage_exports_bucket.sql
lib/email/templates/dataExport.ts
lib/email/__tests__/dataExport.test.ts               (≥ 4 tests)
lib/inngest/functions/exportUserData.ts
lib/inngest/__tests__/exportUserData.test.ts          (≥ 6 tests)
app/api/export/route.ts
app/api/export/__tests__/export.test.ts              (≥ 5 tests)
app/(app)/data/page.tsx
```

### Files to MODIFY

```
app/api/inngest/route.ts    — add exportUserData import + register
proxy.ts                    — add "/data" to PROTECTED_ROUTES
```

### Files NOT to touch

```
lib/inngest/client.ts
lib/email/resend.ts
lib/inngest/functions/generateBriefing.ts
lib/inngest/functions/retentionCleanup.ts
lib/inngest/functions/checkInactivity.ts
supabase/migrations/001_audit_logs.sql through 007_*
```

## Senior Developer Review (AI)

**Review Date:** 2026-06-12  
**Outcome:** Changes Requested  
**Layers:** Blind Hunter · Edge Case Hunter · Acceptance Auditor (3/3 completed)

### Action Items

- [x] [Review][Decision] Email failure handling — Decision B chosen: keep silent failure; upload is success signal. Email error logged but does not throw.
- [x] [Review][Patch] No rate limiting on POST /api/export — any authenticated user can spam unlimited Inngest jobs [app/api/export/route.ts]
- [x] [Review][Patch] `timestamp`/`path` computed outside Inngest steps — on retry a new timestamp is generated, creating orphaned storage files and causing `createSignedUrl` to sign a non-existent path [lib/inngest/functions/exportUserData.ts:18-19]
- [x] [Review][Patch] No `.limit()` on list queries — Supabase 1000-row default silently truncates exports; GDPR violation for power users [lib/inngest/functions/exportUserData.ts:32-38]
- [x] [Review][Patch] `fetch-user-data` query errors unchecked — if any query fails, `null`/`[]` is silently written to the export without throwing [lib/inngest/functions/exportUserData.ts:28-45]
- [x] [Review][Patch] RLS `foldername[1]` returns `'exports'` not `userId` — authenticated users can never read their own export files via the storage API [supabase/migrations/008_storage_exports_bucket.sql:8]
- [x] [Review][Patch] `userName` interpolated unescaped into HTML email — XSS risk if `user_metadata.name` contains HTML [lib/email/templates/dataExport.ts:19]
- [x] [Review][Patch] Non-idempotent email send — no `idempotencyKey` on `inngest.send` or Resend call; up to 4 emails sent on 3 retries [lib/inngest/functions/exportUserData.ts, app/api/export/route.ts]
- [x] [Review][Patch] `data_export_generated` logged only when email send succeeds — should fire when export is generated (upload complete), regardless of email outcome [lib/inngest/functions/exportUserData.ts:113]
- [x] [Review][Patch] `handleExport` has no programmatic double-submit guard — `disabled` is presentation-layer only [app/(app)/data/page.tsx:14]
- [x] [Review][Defer] No DELETE policy on exports bucket — old files accumulate indefinitely — deferred, pre-existing storage lifecycle gap
- [x] [Review][Defer] `upsert:true` overwrite race — mostly mitigated once timestamp-outside-steps is fixed — deferred, low risk after P2
- [x] [Review][Defer] Missing `ALTER TABLE ENABLE RLS` — Supabase Storage enables RLS on `storage.objects` automatically — deferred, not needed
- [x] [Review][Defer] `userId` from event payload not validated as UUID — deferred, always sourced from verified Supabase session

### Review Follow-ups (AI)

*(to be filled by dev agent when addressing review findings)*

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(none)

### Completion Notes List

- All 7 tasks complete; 375 tests passing (21 new), 0 regressions.
- `proxy.ts` already had `/data` in PROTECTED_ROUTES from a prior fix — no change needed.
- `exportUserData` registered with `retries: 3`; email failure does not throw so upload is always the success signal.
- Inngest step names: `fetch-user-data`, `upload-export`, `send-email`.
- Path format: `exports/{userId}/{iso-timestamp-sanitized}.json` — colons and dots replaced with dashes.
- `profiles` queried with `.eq("id", userId)` (PK is `id`, not `user_id`).

### File List

- supabase/migrations/008_storage_exports_bucket.sql (created)
- lib/email/templates/dataExport.ts (created)
- lib/email/__tests__/dataExport.test.ts (created)
- lib/inngest/functions/exportUserData.ts (created)
- lib/inngest/__tests__/exportUserData.test.ts (created)
- app/api/export/route.ts (created)
- app/api/export/__tests__/export.test.ts (created)
- app/(app)/data/page.tsx (created)
- app/api/inngest/route.ts (modified — added exportUserData)

### Change Log

- 2026-05-15: Story created — Sprint 6, Epic 6 Story 1; GDPR data export via Inngest + Supabase Storage + Resend
- 2026-05-15: Implementation complete — all ACs satisfied, 375 tests passing
- 2026-06-12: Code review patches applied — 9 issues resolved: rate limiting (P1), timestamp inside step (P2), row limits (P3), query error checks (P4), RLS foldername[2] fix + migration 009 (P5), HTML-escape userName (P6), inngest idempotency key (P7), log placement after upload (P8), double-submit guard (P9)
