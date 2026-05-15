# Story 5.4: Notification Preferences & Unsubscribe

Status: done

## Story

As a signed-in user,
I want to control which notification emails I receive and unsubscribe from them,
So that I can avoid unwanted email noise.

## Acceptance Criteria

**AC1 — Notification preferences UI:** Given I navigate to `/settings`, when the page loads, then a "Notification preferences" section shows two toggles:
- "Daily briefing emails" (maps to `notification_preferences.briefingEmails`)
- "Re-engagement nudges" (maps to `notification_preferences.reengagementEmails`)
Both default to `true` (on). Toggling saves immediately (optimistic update, PATCH on blur or on toggle change).

**AC2 — PATCH /api/notifications endpoint:** Given an authenticated PATCH request to `/api/notifications` with body `{ briefingEmails?: boolean, reengagementEmails?: boolean }`, when the handler runs, it updates `profiles.notification_preferences` merging the provided keys into the existing JSONB value, returns `{ data: { notification_preferences } }` on success. Unauthenticated → 401. Invalid body (non-boolean values) → 422.

**AC3 — Unsubscribe endpoint:** Given a GET request to `/api/unsubscribe?token=<hmac_token>&userId=<userId>&type=<type>`, when the handler runs, if the HMAC token is valid (verified with `UNSUBSCRIBE_SECRET` env var), it sets `notification_preferences.<type> = false` for that user using the service-role client (unauthenticated endpoint), returns a plain HTML page "You have been unsubscribed." If the token is invalid → 400 "Invalid unsubscribe link." If `type` is not one of `briefingEmails|reengagementEmails` → 400.

**AC4 — Unsubscribe link in re-engagement emails:** The re-engagement email (from Story 5.3 `buildReengagementEmail`) includes an unsubscribe link: `{APP_BASE_URL}/api/unsubscribe?token=<hmac>&userId=<userId>&type=reengagementEmails`. The HMAC is `sha256(userId + type + UNSUBSCRIBE_SECRET)` using Node's `crypto.createHmac`.

**AC5 — Unsubscribe link in briefing emails:** The briefing email also includes an unsubscribe footer link pointing to `/api/unsubscribe?...&type=briefingEmails`. Update `buildBriefingEmail` in `lib/email/templates/briefing.ts` to accept an optional `unsubscribeUrl` parameter and append a footer link.

## Tasks / Subtasks

- [x] **Task 1 — `lib/email/unsubscribe.ts` utility** (AC: #3, #4, #5)
  - [x] Create `lib/email/unsubscribe.ts` — export `generateUnsubscribeToken(userId, type)` and `verifyUnsubscribeToken(userId, type, token)`
  - [x] `generateUnsubscribeToken`: `createHmac("sha256", process.env.UNSUBSCRIBE_SECRET ?? "dev-secret").update(`${userId}:${type}`).digest("hex")`
  - [x] `verifyUnsubscribeToken`: generates expected token, compares with provided token (string equality; note timing-attack risk is low for unsubscribe)
  - [x] Create `lib/email/__tests__/unsubscribe.test.ts` with ≥ 4 tests: generates deterministic token, different userId/type produce different tokens, valid token verifies true, tampered token verifies false

- [x] **Task 2 — `PATCH /api/notifications` endpoint** (AC: #2)
  - [x] Create `app/api/notifications/route.ts`
  - [x] Auth guard: 401 if no session (same pattern as `app/api/goals/route.ts`: `authError || !user`)
  - [x] Parse body; validate with `NotificationPreferencesSchema` Zod in `lib/validation/notificationPreferences.ts` — schema accepts `{ briefingEmails?: z.boolean(), reengagementEmails?: z.boolean() }` with `.refine()` that at least one key is present; invalid body → 422 with `{ error: { code: "VALIDATION_ERROR", message, field } }`
  - [x] Fetch existing `notification_preferences` from `profiles` via `supabase.from("profiles").select("notification_preferences").eq("id", user.id).single()`
  - [x] Merge updates: `const merged = { ...(profile.notification_preferences as object), ...updates }`
  - [x] Update: `supabase.from("profiles").update({ notification_preferences: merged }).eq("id", user.id)`
  - [x] Return `{ data: { notification_preferences: merged } }` on success; `{ error: { code: "DB_ERROR", ... } }` on DB failure → 500
  - [x] Create `app/api/notifications/__tests__/notifications.test.ts` with ≥ 6 tests: 401 unauthenticated, 422 non-boolean body, 422 empty body, successful PATCH merges correctly, DB error → 500, partial update (only one key) merges without clobbering other key

- [x] **Task 3 — `GET /api/unsubscribe` endpoint** (AC: #3)
  - [x] Create `app/api/unsubscribe/route.ts` — unauthenticated `GET` handler
  - [x] Parse query params: `token`, `userId`, `type`
  - [x] Validate `type` is one of `["briefingEmails", "reengagementEmails"]`; if not → return HTML 400 "Invalid unsubscribe link."
  - [x] Call `verifyUnsubscribeToken(userId, type, token)`; if false → return HTML 400 "Invalid unsubscribe link."
  - [x] Use service-role Supabase client (`createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY`) — bypasses RLS, no user session required
  - [x] Fetch existing `notification_preferences`, merge `{ [type]: false }`, update `profiles` row using `.eq("id", userId)`
  - [x] Return HTML 200: `<html><body><p>You have been unsubscribed.</p></body></html>` with `Content-Type: text/html`
  - [x] Missing `token`, `userId`, or `type` params → HTML 400 "Invalid unsubscribe link."
  - [x] Create `app/api/unsubscribe/__tests__/unsubscribe.test.ts` with ≥ 6 tests: valid token → 200 HTML, invalid token → 400 HTML, invalid type → 400 HTML, missing params → 400 HTML, sets correct preference key to false, other preference key unaffected

- [x] **Task 4 — Settings page UI** (AC: #1)
  - [x] Create `app/(app)/settings/page.tsx` as `"use client"` component — same structural pattern as `app/(app)/goals/page.tsx`
  - [x] On mount: `fetch("/api/notifications")` — `GET /api/notifications` reads `notification_preferences` from profile
  - [x] State: `briefingEmails: boolean`, `reengagementEmails: boolean`, `isLoading: boolean`, `saveError: string`
  - [x] Skeleton loading: two rows of `animate-pulse bg-coach-observation` while loading
  - [x] Render in a `<section>` with heading "Notification preferences" and two toggle rows; native `<button role="switch">` (no Switch component available)
  - [x] On toggle change: optimistic state update first, then `PATCH /api/notifications`; on error, revert and show `saveError` banner (amber, role="alert")
  - [x] Page max-width `max-w-lg px-4 py-12`; page `<h1>` reads "Settings"

- [x] **Task 5 — Add unsubscribe links to outgoing emails** (AC: #4, #5)
  - [x] Update `lib/inngest/functions/checkInactivity.ts` — `buildReengagementEmail` now accepts optional `unsubscribeUrl` parameter; HTML footer + plain-text line appended when provided
  - [x] In `checkInactivity` function: `generateUnsubscribeToken(user.id, "reengagementEmails")` → URL constructed and passed to `buildReengagementEmail`
  - [x] Update `lib/email/templates/briefing.ts` — `buildBriefingEmail` accepts optional second param `unsubscribeUrl?: string`; appends footer link to HTML and unsubscribe line to text when provided
  - [x] Update `generateBriefing.ts` — imports `generateUnsubscribeToken`, constructs briefingEmails unsubscribe URL, passes to `buildBriefingEmail`

## Dev Notes

### Schema context

From `supabase/migrations/002_profiles.sql`, the `profiles` table has:
```sql
notification_preferences JSONB NOT NULL DEFAULT '{"briefingEmails": true, "reengagementEmails": true}'
```
Keys are camelCase (`briefingEmails`, `reengagementEmails`) and match the JSONB filter already used in `lib/inngest/functions/checkInactivity.ts`:
```ts
.filter("notification_preferences->reengagementEmails", "eq", true)
```
Note: `profiles.id` is the primary key and equals `auth.users.id` — queries against the service-role client use `.eq("id", userId)` not `.eq("user_id", userId)`.

### HMAC token generation

```ts
// lib/email/unsubscribe.ts
import { createHmac } from "crypto";

export function generateUnsubscribeToken(userId: string, type: string): string {
  return createHmac("sha256", process.env.UNSUBSCRIBE_SECRET ?? "dev-secret")
    .update(`${userId}:${type}`)
    .digest("hex");
}

export function verifyUnsubscribeToken(userId: string, type: string, token: string): boolean {
  const expected = generateUnsubscribeToken(userId, type);
  return expected === token; // constant-time comparison preferred but timing attack risk is low for unsubscribe
}
```

### Zod validation schema

```ts
// lib/validation/notificationPreferences.ts
import { z } from "zod";

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

### PATCH /api/notifications pattern

```ts
// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { NotificationPreferencesSchema } from "@/lib/validation/notificationPreferences";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid JSON." } }, { status: 400 });
  }

  const parsed = NotificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: issue.message, field: issue.path[0] } },
      { status: 422 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  const merged = { ...(profile?.notification_preferences as object ?? {}), ...parsed.data };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ notification_preferences: merged })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to update preferences." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { notification_preferences: merged } });
}
```

### GET /api/notifications pattern (needed by settings page)

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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch preferences." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { notification_preferences: profile.notification_preferences } });
}
```

### Unsubscribe endpoint (unauthenticated, service-role)

```ts
// app/api/unsubscribe/route.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

const VALID_TYPES = ["briefingEmails", "reengagementEmails"] as const;
type ValidType = (typeof VALID_TYPES)[number];

function htmlResponse(body: string, status = 200) {
  return new Response(`<html><body><p>${body}</p></body></html>`, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");
  const type = searchParams.get("type");

  if (!token || !userId || !type) {
    return htmlResponse("Invalid unsubscribe link.", 400);
  }

  if (!VALID_TYPES.includes(type as ValidType)) {
    return htmlResponse("Invalid unsubscribe link.", 400);
  }

  if (!verifyUnsubscribeToken(userId, type, token)) {
    return htmlResponse("Invalid unsubscribe link.", 400);
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await adminClient
    .from("profiles")
    .select("notification_preferences")
    .eq("id", userId)
    .single();

  const updated = { ...(profile?.notification_preferences as object ?? {}), [type]: false };

  await adminClient
    .from("profiles")
    .update({ notification_preferences: updated })
    .eq("id", userId);

  return htmlResponse("You have been unsubscribed.");
}
```

### Settings page pattern

The `/settings` page does not yet exist. Create `app/(app)/settings/page.tsx` as a `"use client"` component following the same structural pattern as `app/(app)/goals/page.tsx`: `useEffect` fetch on mount, local state, optimistic toggle updates via direct `fetch`, amber error banner on network failure.

```tsx
// app/(app)/settings/page.tsx (sketch)
"use client";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface NotificationPreferences {
  briefingEmails: boolean;
  reengagementEmails: boolean;
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    briefingEmails: true,
    reengagementEmails: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.notification_preferences) {
          setPrefs(json.data.notification_preferences);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    const prev = prefs[key];
    setPrefs((p) => ({ ...p, [key]: value })); // optimistic
    setSaveError("");
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) {
      setPrefs((p) => ({ ...p, [key]: prev })); // revert
      const json = await res.json();
      setSaveError(json?.error?.message ?? "Failed to save preference.");
    }
  }

  // render: h1 "Settings", section "Notification preferences", two Switch rows, skeleton while loading
}
```

### Outgoing email footer pattern

`buildReengagementEmail` in `lib/inngest/functions/checkInactivity.ts` currently accepts `(firstName, appUrl)`. Add a third `unsubscribeUrl` parameter:

```ts
export function buildReengagementEmail(firstName: string, appUrl: string, unsubscribeUrl?: string) {
  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="font-size:12px;color:#666;margin-top:24px;">Don't want these emails? <a href="${unsubscribeUrl}">Unsubscribe</a></p>`
    : "";
  const unsubscribeText = unsubscribeUrl
    ? `\n\nTo unsubscribe: ${unsubscribeUrl}`
    : "";
  return {
    subject: `Your streak is waiting, ${firstName}`,
    html: `...existing html...${unsubscribeHtml}`,
    text: `...existing text...${unsubscribeText}`,
  };
}
```

In the calling step inside `checkInactivity`, generate the URL before sending:
```ts
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe";
// ...
const unsubToken = generateUnsubscribeToken(user.id, "reengagementEmails");
const unsubscribeUrl = `${APP_BASE_URL}/api/unsubscribe?token=${unsubToken}&userId=${user.id}&type=reengagementEmails`;
const { subject, html, text } = buildReengagementEmail(firstName, APP_BASE_URL, unsubscribeUrl);
```

`buildBriefingEmail` in `lib/email/templates/briefing.ts` — add an optional `unsubscribeUrl?: string` to its options parameter (or top-level signature) and conditionally append a footer link to the `html` and `text` output.

### Existing API auth guard pattern (from `app/api/goals/route.ts`)

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

### Files to CREATE

```
app/(app)/settings/page.tsx
app/api/notifications/route.ts
app/api/notifications/__tests__/notifications.test.ts  (≥ 6 tests)
app/api/unsubscribe/route.ts
app/api/unsubscribe/__tests__/unsubscribe.test.ts      (≥ 6 tests)
lib/email/unsubscribe.ts
lib/email/__tests__/unsubscribe.test.ts                (≥ 4 tests)
lib/validation/notificationPreferences.ts
```

### Files to MODIFY

```
lib/inngest/functions/checkInactivity.ts  — add unsubscribeUrl to buildReengagementEmail signature and call site
lib/email/templates/briefing.ts          — add optional unsubscribeUrl parameter, append footer link
```

(Also update whichever Inngest function calls `buildBriefingEmail` to pass the unsubscribe URL.)

### Files NOT to touch

```
utils/supabase/server.ts
lib/inngest/client.ts
lib/email/resend.ts
supabase/migrations/002_profiles.sql
supabase/migrations/007_add_reengagement_tracking.sql
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(empty)

### Completion Notes List

- All 5 tasks complete. 364 tests passing (23 new: 8 unsubscribe utility, 9 notifications API, 6 unsubscribe endpoint).
- `lib/email/unsubscribe.ts`: HMAC sha256 keyed by `UNSUBSCRIBE_SECRET` env var; `generateUnsubscribeToken`/`verifyUnsubscribeToken` exports.
- `lib/validation/notificationPreferences.ts`: Zod schema with `.refine()` requiring at least one key.
- `app/api/notifications/route.ts`: `GET` (read prefs) + `PATCH` (merge-update); auth guard → 401; body validation → 422; DB error → 500.
- `app/api/unsubscribe/route.ts`: Unauthenticated `GET`; HMAC verification; service-role client; HTML responses.
- `app/(app)/settings/page.tsx`: `"use client"` page; native `<button role="switch">` toggles (no Switch component in project); optimistic updates with revert-on-error; skeleton loading; amber error banner.
- `buildReengagementEmail` updated: optional `unsubscribeUrl` param; footer link in HTML and text.
- `buildBriefingEmail` updated: optional second param `unsubscribeUrl`; footer link appended.
- `generateBriefing.ts` and `checkInactivity.ts` updated to generate and pass unsubscribe URLs.
- `CoachVoiceLine` variant type extended to include `"observation"` (fixes pre-existing TS error from Story 5.2).

### File List

- `lib/email/unsubscribe.ts` — new
- `lib/email/__tests__/unsubscribe.test.ts` — new (8 tests)
- `lib/validation/notificationPreferences.ts` — new
- `app/api/notifications/route.ts` — new (GET + PATCH)
- `app/api/notifications/__tests__/notifications.test.ts` — new (9 tests)
- `app/api/unsubscribe/route.ts` — new
- `app/api/unsubscribe/__tests__/unsubscribe.test.ts` — new (6 tests)
- `app/(app)/settings/page.tsx` — new
- `lib/inngest/functions/checkInactivity.ts` — modified (unsubscribeUrl in buildReengagementEmail + call site)
- `lib/inngest/functions/generateBriefing.ts` — modified (generateUnsubscribeToken import + pass to buildBriefingEmail)
- `lib/email/templates/briefing.ts` — modified (optional unsubscribeUrl second parameter)
- `components/ui/coach-voice-line.tsx` — modified (added "observation" variant)

### Change Log

- 2026-05-15: Story created — Sprint 5, Epic 5; covers FR25 (notification preferences UI + API) and FR26 (one-click unsubscribe via HMAC token)
