---
project_name: LifePilot
user_name: Ljuppa
date: '2026-06-14'
phase: Phase 2 (post Phase-1 complete)
test_count: 496
migration_count: 15
---

# Project Context for AI Agents

_Critical rules and patterns AI agents must follow when implementing code in this project. Covers non-obvious details that agents miss without explicit guidance._

---

## Technology Stack & Versions

| Technology | Version | Notes |
|---|---|---|
| Next.js | 16.2.6 | App Router; proxy.ts is the middleware file (not middleware.ts) |
| React | 19.2.4 | Server Components default; `"use client"` only for interactivity |
| TypeScript | ^5 | Strict mode enabled |
| Supabase | @supabase/supabase-js ^2.105.4, @supabase/ssr ^0.10.3 | Cookie-based auth; RLS on all tables |
| Zod | ^4.4.3 | **`.issues` not `.errors`** — Zod v4 breaking change |
| Inngest | ^4.4.0 | v4 API — `step.run()` for memoized steps; `retries: 3` |
| Resend | ^6.12.3 | `getResendClient()` singleton in `lib/email/resend.ts` |
| Anthropic SDK | ^0.96.0 | Haiku for briefings; prompt caching on system prefix |
| Vitest | ^4.1.6 | Test framework; 496 tests, 0 regressions |
| react-hook-form | ^7.75.0 | Always with Zod resolver; mirrors server-side schema |
| Tailwind CSS | ^4 | Design token-based; no ad-hoc colour values |
| @upstash/ratelimit | ^2.0.8 | Sliding window; used on auth routes; `lib/rate-limit.ts` |

---

## Project Structure

```
lifepilot/
├── proxy.ts                          ← middleware (NOT middleware.ts)
├── app/
│   ├── (auth)/                       ← unauthenticated routes
│   ├── (app)/                        ← protected user routes
│   │   ├── dashboard/
│   │   ├── briefing/
│   │   ├── goals/
│   │   ├── checkin/
│   │   ├── profile/
│   │   └── settings/
│   ├── admin/                        ← admin-only routes (role guard in layout.tsx)
│   │   ├── layout.tsx                ← role guard: profiles.role === 'admin'
│   │   ├── page.tsx                  ← metrics dashboard
│   │   ├── users/                    ← per-user email delivery lookup
│   │   └── broadcast/                ← system-wide broadcast form
│   └── api/
│       ├── auth/sign-in, sign-up, sign-out
│       ├── admin/metrics, users, broadcast  ← 4-step guard pattern
│       ├── briefing/, checkin/, goals/, profile/
│       ├── export/, unsubscribe/, notifications/
│       └── inngest/route.ts          ← Inngest serve() — register all functions here
├── components/
│   └── ui/                           ← shadcn/ui — NEVER edit these files manually
├── lib/
│   ├── admin/
│   │   ├── getMetrics.ts             ← service fn for /api/admin/metrics
│   │   └── getUserData.ts            ← service fn for /api/admin/users
│   ├── email/
│   │   ├── resend.ts                 ← getResendClient() singleton
│   │   ├── unsubscribe.ts            ← generateUnsubscribeToken(userId, type)
│   │   └── templates/
│   │       ├── briefing.ts           ← buildBriefingEmail()
│   │       ├── dataExport.ts         ← buildDataExportEmail(); has escapeHtml
│   │       └── broadcast.ts          ← buildBroadcastEmail(); has escapeHtml
│   ├── inngest/
│   │   ├── client.ts                 ← inngest instance — DO NOT MODIFY
│   │   └── functions/
│   │       ├── generateBriefing.ts
│   │       ├── retentionCleanup.ts
│   │       ├── checkInactivity.ts
│   │       ├── exportUserData.ts
│   │       └── sendBroadcast.ts
│   ├── claude/                       ← Anthropic client, prompt builder, safety filter
│   ├── rate-limit.ts                 ← checkRateLimit(key, max) — Upstash + in-memory fallback
│   └── validation/                   ← Zod schemas — ALWAYS import from here, never define inline
│       ├── admin.ts                  ← AdminUserLookupSchema, AdminBroadcastSchema
│       ├── auth.ts
│       ├── checkin.ts
│       ├── goal.ts
│       ├── notificationPreferences.ts
│       └── profile.ts
├── utils/
│   └── supabase/
│       ├── server.ts                 ← createClient() for RSC/route handlers
│       └── client.ts                 ← createBrowserClient() for client components
└── supabase/
    └── migrations/                   ← 15 migrations (001–015)
```

---

## Critical Implementation Rules

### 1. Zod v4: use `.issues` not `.errors`

```ts
// ✅ Correct — Zod v4
const parsed = Schema.safeParse(body);
if (!parsed.success) {
  const message = parsed.error.issues[0]?.message ?? "Invalid input";
}

// ❌ Wrong — Zod v3 API, does not work
parsed.error.errors[0]?.message
```

### 2. Admin Route 4-Step Guard Pattern

Every `/api/admin/*` route handler MUST follow this exact order:

```ts
// 1. Env var guard (no DB hit)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) return NextResponse.json({ error: { code: "CONFIG_ERROR", ... } }, { status: 500 });

// 2. Session auth via JWT (no DB hit)
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });

// 3. Input validation (Zod — no DB hit)
const parsed = AdminSchema.safeParse(body);
if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message } }, { status: 400 });

// 4. Role DB check (first DB hit)
const adminClient = createClient(SUPABASE_URL, serviceRoleKey);
const { data: profile, error: profileError } = await adminClient.from("profiles").select("role").eq("id", user.id).single();
if (profileError) return NextResponse.json({ error: { code: "DB_ERROR", ... } }, { status: 500 });
if (profile?.role !== "admin") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

// 5. Business logic
```

### 3. HTML Templates: Always Escape Interpolated Values

Any value interpolated into HTML email templates MUST be escaped. `escapeHtml` is defined locally in each template file (duplication is known; extraction to `lib/utils/html.ts` is a Phase 2 task):

```ts
function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

// ⚠️ Apply to EVERY interpolated value, including URL href attributes:
const html = `<a href="${escapeHtml(url)}">Link</a>`;  // NOT href="${url}"
```

**The `&` in query string parameters (`?token=X&userId=Y`) will break email client HTML parsers if not escaped to `&amp;`.** This was caught in code review.

### 4. Service-Role Client for Admin Operations

Never use the user-session client for admin operations — it is RLS-restricted:

```ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 5. Check ALL DB Errors Explicitly

Never silently swallow errors from any DB operation:

```ts
// ✅ Check every query result
const { data: briefings, error: briefingsError } = await adminClient.from("briefings")...;
const { data: reengagements, error: reengagementsError } = await adminClient.from("reengagement_notifications")...;
const { data: profile, error: profileError } = await adminClient.from("profiles")...;

if (briefingsError || reengagementsError || profileError) {
  return NextResponse.json({ error: { code: "DB_ERROR", ... } }, { status: 500 });
}

// ❌ Never check only the first query and ignore others
if (briefingsError) { ... }  // misses reengagements and profile errors
```

### 6. Inngest Step Pattern (v4)

```ts
// Memoized step — safe to retry
const result = await step.run("step-name", async () => {
  // work here
  return value;
});

// Fan-out with batching (BATCH_SIZE=100 to stay under ~1,000 step ceiling)
const BATCH_SIZE = 100;
for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
  const batch = recipients.slice(i, i + BATCH_SIZE);
  await step.run(`process-batch-${i / BATCH_SIZE}`, async () => {
    // process batch
  });
}

// Pagination for Supabase queries (PostgREST default cap = 1,000 rows)
const PAGE_SIZE = 1000;
let offset = 0;
const allRows: Row[] = [];
while (true) {
  const { data, error } = await adminClient.from("table").select("*").range(offset, offset + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  allRows.push(...(data ?? []));
  if (!data || data.length < PAGE_SIZE) break;
  offset += PAGE_SIZE;
}
```

### 7. Inngest Event Naming Convention

Pattern: `{domain}/{entity}.{verb}`

```ts
"briefing/generate.requested"
"export/data.requested"
"notification/reengagement.triggered"
"notification/broadcast.requested"
```

Always include `userId` and `triggeredAt` (ISO 8601) in event data. No PII beyond `userId`.

### 8. Audit Log Pattern (Fire-and-Forget with Error Logging)

```ts
adminClient
  .from("audit_logs")
  .insert({ user_id: userId, event_type: "event_name", metadata: { /* no body content */ } })
  .then(({ error }: { error: { code: string } | null }) => {
    if (error) console.error(JSON.stringify({ event: "audit_log_error", code: error.code }));
  })
  .catch((err: Error) => {
    console.error(JSON.stringify({ event: "audit_log_error", message: err.message }));
  });
```

For Inngest functions where the audit log must be durable (no double-fire on retry), wrap in `step.run("write-audit-log", ...)`.

### 9. Structured Logging — No PII

```ts
// ✅ Correct — no PII
console.log(JSON.stringify({ event: "briefing_sent", userId: user.id, emailStatus: "delivered" }));

// ❌ Never log PII
console.log(`Sent email to ${user.email}`);
console.error({ event: "error", name: profile.name, health: checkin.data });
```

Permitted in logs: `userId` (UUID), event codes, counts, statuses, timestamps.

### 10. API Response Format

Always wrap responses — never return naked data:

```ts
// ✅ Success
return NextResponse.json({ data: result });

// ✅ Error
return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "..." } }, { status: 400 });

// ❌ Naked return
return NextResponse.json(result);
```

### 11. Standard Error Codes

| Code | HTTP Status | Use Case |
|---|---|---|
| `CONFIG_ERROR` | 500 | Missing required env var |
| `UNAUTHORIZED` | 401 | Not authenticated (`message: "Not authenticated"`) |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `VALIDATION_ERROR` | 400 | Failed Zod schema validation |
| `NOT_FOUND` | 404 | Resource does not exist |
| `DB_ERROR` | 500 | Database operation failed |
| `AUTH_ERROR` | 502 | Supabase Auth service failure (distinct from 404 NOT_FOUND) |
| `RATE_LIMITED` | 429 | Rate limit exceeded |

### 12. Notification Preference Types

Valid values for `type` in unsubscribe tokens and notification preference keys:

```ts
const VALID_TYPES = ["briefingEmails", "reengagementEmails", "broadcastEmails"] as const;
```

All three are stored in `profiles.notification_preferences` as JSONB. Default: all `true`.

### 13. Rate Limiting

Auth routes use `checkRateLimit` from `lib/rate-limit.ts`:

```ts
const rl = await checkRateLimit(`sign-in:${ip}`, 5);  // 5 req per 15 min
if (!rl.ok) return NextResponse.json({ error: { code: "RATE_LIMITED", ... } }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } });
```

Currently applied to: `sign-in`, `sign-up`, `export`. **Admin endpoints do not yet have rate limiting** (Phase 2 task).

### 14. CAN-SPAM Compliance in Email Templates

All notification emails must include:
1. Physical mailing address: `process.env.COMPANY_MAILING_ADDRESS ?? "LifePilot, 548 Market St, San Francisco CA 94104"`
2. One-click unsubscribe link using `generateUnsubscribeToken(userId, preferenceType)` from `lib/email/unsubscribe.ts`

The unsubscribe URL format:
```
${APP_BASE_URL}/api/unsubscribe?token=${token}&userId=${userId}&type=${preferenceType}
```
**Escape this entire URL with `escapeHtml()` when interpolating into HTML `href` attributes.**

### 15. AI Content Disclosure

All surfaces that render LLM-generated content MUST wrap in `AiDisclosureWrapper`:

```tsx
import { AiDisclosureWrapper } from "@/components/ui/ai-disclosure-wrapper";

<AiDisclosureWrapper>
  {briefingContent}
</AiDisclosureWrapper>
```

Admin-authored content (broadcast emails) does NOT need the disclosure wrapper.

---

## Database Schema Summary

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User profile + preferences | `id`, `role` (user/admin), `notification_preferences` (JSONB), `pending_deletion` |
| `goals` | User goals per domain | `id`, `user_id`, `domain`, `title`, `target_value`, `current_value` |
| `checkins` | Daily check-in records | `id`, `user_id`, `checked_in_at`, `mood`, `wellness`, `finance` (unique per user per day) |
| `briefings` | Generated daily briefings | `id`, `user_id`, `briefing_date`, `content` (JSON), `email_status` |
| `audit_logs` | Append-only admin/compliance log | `id`, `user_id`, `event_type`, `metadata` (JSONB, no PII) |
| `reengagement_notifications` | Re-engagement email tracking | `id`, `user_id`, `sent_at`, `email_status` |
| `storage.objects` | Data export files | Signed URLs, 1h expiry, bucket: `exports` |

---

## Migrations (15 shipped)

001 audit_logs → 002 profiles → 003 goals → 004 checkins → 005 checkins_unique_day → 006 briefings → 007 add_reengagement_tracking → 008 storage_exports_bucket → 009 fix_exports_rls → 010 retention_indexes → 011 profiles_pending_deletion → 012 add_admin_role → 013 admin_metrics_rpc → 014 reengagement_notifications → 015 broadcast_preference

---

## Known Deferred Items (Phase 2 Backlog)

See `_bmad-output/implementation-artifacts/deferred-work.md` for full list. Key items:

- **`target_value` missing from goal form** — progress bars show "No data yet"; blocking for user testing
- **CSRF protection** — not on any mutating route; add before user testing
- **Admin endpoint rate limiting** — broadcast endpoint especially
- **`escapeHtml` duplication** — exists in both `dataExport.ts` and `broadcast.ts`; extract to `lib/utils/html.ts`
- **Exports bucket DELETE policy** — old files accumulate; add storage lifecycle rule
- **Dialog `aria-labelledby`** — accessibility gap on modal dialogs

---

## Testing

```bash
npx vitest run          # full suite (496 tests)
npx vitest run --coverage
npx tsc --noEmit        # type check
```

Test files co-located with source as `__tests__/` subdirectories or `.test.ts` siblings. Follow existing mock patterns — see `lib/inngest/__tests__/sendBroadcast.test.ts` for Inngest function mocking.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-only, admin ops) |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `RESEND_API_KEY` | ✅ | Resend email delivery key |
| `INNGEST_EVENT_KEY` | ✅ | Inngest event signing key |
| `INNGEST_SIGNING_KEY` | ✅ | Inngest webhook signing key |
| `APP_BASE_URL` | ✅ | Base URL for unsubscribe links (e.g. `https://lifepilot.app`) |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis URL (rate limiting; falls back to in-memory if absent) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis token |
| `COMPANY_MAILING_ADDRESS` | Optional | Physical address for CAN-SPAM compliance footer |

---

*Generated: 2026-06-14 — Paige (Technical Writer)*
*Phase 1 complete — 7 epics, 15 migrations, 496 tests*
