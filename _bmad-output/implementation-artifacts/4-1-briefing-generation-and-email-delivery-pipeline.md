# Story 4.1: Briefing Generation & Email Delivery Pipeline

Status: ready-for-dev

## Story

As an active user with a configured profile and goals,
I want to receive a personalised AI-generated daily briefing via email at my configured time,
so that I start each day with specific, actionable guidance without having to open any app.

## Acceptance Criteria

**AC1 — Inngest cron triggers generation:** Given a user's configured `briefing_time` is reached (in their timezone), when the Inngest cron fires, then a `briefing/generate.requested` event is emitted with `{ userId, triggeredAt }` and `generateBriefing` begins execution.

**AC2 — Context fetch:** Given the function is running, when it fetches context, then it retrieves user profile + active goals + last 7 days of `checkins` rows via `createClient()` using the stored `user_id` — no client-supplied identity.

**AC3 — Prompt caching:** Given context is fetched, when `buildBriefingPrompt()` in `lib/claude/prompts.ts` assembles the request, then the system prompt prefix is sent with Anthropic prompt caching headers (`cache_control: { type: "ephemeral" }`); the dynamic user block contains profile, goals, last 7 check-ins, today's date and day of week.

**AC4 — Claude Haiku model, correct model ID:** Given the prompt is assembled, when `lib/claude/client.ts` calls the API, then model is hardcoded to `claude-haiku-4-5-20251001` (not Sonnet); response is structured JSON with one suggestion object per active goal domain.

**AC5 — Safety filter:** Given the LLM returns a response, when `filterLlmOutput()` in `lib/claude/safety.ts` runs, then it blocks: caloric thresholds below 1200, "stop eating" language, specific investment recommendations, harmful content; if triggered, content is replaced with a safe fallback and `safety_filter_triggered: true` is set on the briefing record; no secondary LLM call.

**AC6 — Briefing stored:** Given content passes or is filtered, when stored, then a `briefings` row is inserted with `user_id`, `content` (JSON), `briefing_date`, `email_status: 'pending'`, and `safety_filter_triggered`; RLS enforces `user_id = auth.uid()`.

**AC7 — Email built and sent:** Given the briefing is stored, when the email is built and sent via Resend, then: subject = `"Your [Weekday] — [one-line focus preview]"`; opening personalised prose paragraph; one suggestion per active goal domain; single CTA `"Log today's check-in"` deep-linking to `/checkin`; sign-off `"That's your [Weekday], [Name]. Make it count."`; footer `"✦ AI-generated — not medical, nutritional, or financial advice."`; plain-text alternative on every send; 600px max-width single-column HTML with inline CSS.

**AC8 — email_status updated:** Given Resend confirms delivery, then `email_status` is updated to `'delivered'`; on failure `email_status = 'failed'`; briefing remains in-app regardless of email outcome.

**AC9 — Inngest retry on failure:** Given the function fails at any step, when the failure occurs, then Inngest retries up to 3 times with exponential backoff; any already-stored briefing row remains readable in-app.

**AC10 — Inngest signing key verified:** Given `POST /api/inngest` receives a webhook event, when the request arrives, then the Inngest signing key is verified before any handler runs; this route is the single entry point for all background jobs.

**AC11 — GET /api/briefing returns history list:** Given I am authenticated, when `GET /api/briefing` is called, then it returns my last 30 briefings (`briefing_date >= today − 30 days`), ordered by date descending, wrapped in `{ data: [...] }`; 401 if unauthenticated.

**AC12 — GET /api/briefing/[id] returns single briefing:** Given I am authenticated, when `GET /api/briefing/[id]` is called, then it returns the single briefing record for the authenticated user; 404 if not found; 401 if unauthenticated.

**AC13 — Structured logging, no PII:** Given the Inngest function logs, when it writes to the console, then structured JSON only: `{ userId, event: 'briefing_generated' | 'email_delivery_failed', ... }` — no email address, name, health data, or briefing content in log fields.

## Tasks / Subtasks

- [ ] **Task 1 — Install packages** (AC: #4, #7, #10)
  - [ ] `npm install @anthropic-ai/sdk inngest resend`
  - [ ] Add env vars to `.env.example`: `ANTHROPIC_API_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`

- [ ] **Task 2 — Supabase migration: briefings table** (AC: #6)
  - [ ] Create `supabase/migrations/006_briefings.sql`
  - [ ] Include: `id uuid pk`, `user_id uuid → auth.users(cascade)`, `content jsonb not null`, `briefing_date date not null`, `email_status text default 'pending'`, `safety_filter_triggered bool default false`, `helpful bool`, `created_at timestamptz default now()`
  - [ ] RLS: enable + policy `"Users access own briefings"` for all ops with `user_id = auth.uid()`
  - [ ] Indexes: `idx_briefings_user_id`, `idx_briefings_user_id_date (user_id, briefing_date desc)`, `idx_briefings_briefing_date (briefing_date)` (for retention cleanup)
  - [ ] Unique constraint: `(user_id, briefing_date)` — one briefing per user per day

- [ ] **Task 3 — Claude module** (AC: #3, #4, #5)
  - [ ] Create `lib/claude/client.ts` — singleton Anthropic instance
  - [ ] Create `lib/claude/prompts.ts` — `buildBriefingPrompt(profile, goals, checkins, today)` returning messages array with cached system block
  - [ ] Create `lib/claude/safety.ts` — `filterLlmOutput(content: string): { content: string; triggered: boolean }` single-pass pattern filter

- [ ] **Task 4 — Email module** (AC: #7, #8)
  - [ ] Create `lib/email/resend.ts` — Resend singleton
  - [ ] Create `lib/email/templates/briefing.ts` — `buildBriefingEmail(user, briefing): { subject, html, text }` — plain HTML + inline CSS, plain-text alt

- [ ] **Task 5 — Inngest client and functions** (AC: #1, #2, #9)
  - [ ] Create `lib/inngest/client.ts` — Inngest singleton with id `"lifepilot"`
  - [ ] Create `lib/inngest/functions/generateBriefing.ts` — cron `"0 * * * *"` + `briefing/generate.requested` event handler; full pipeline: fetch → prompt → call → filter → store → email → update status
  - [ ] Create `lib/inngest/functions/retentionCleanup.ts` — nightly `"0 2 * * *"` job deleting checkins >12mo and briefings >6mo (uses service-role client)

- [ ] **Task 6 — Inngest route handler** (AC: #10)
  - [ ] Create `app/api/inngest/route.ts` — `serve({ client: inngest, functions: [generateBriefing, retentionCleanup] })` exporting `{ GET, POST, PUT }`

- [ ] **Task 7 — Briefing API routes** (AC: #11, #12)
  - [ ] Create `app/api/briefing/route.ts` — `GET` returning last 30 briefings
  - [ ] Create `app/api/briefing/[id]/route.ts` — `GET` single briefing + `PATCH` for helpfulness (needed by Story 4.3 but schema-safe to add now)

- [ ] **Task 8 — Tests** (AC: all)
  - [ ] `lib/claude/__tests__/safety.test.ts` — unit tests for filter (blocked patterns, safe passthrough, fallback)
  - [ ] `lib/claude/__tests__/prompts.test.ts` — unit tests for prompt builder (structure, cached block present)
  - [ ] `app/api/__tests__/briefing.test.ts` — route handler tests (GET list, GET single, PATCH, auth, 404)
  - [ ] `lib/inngest/__tests__/generateBriefing.test.ts` — integration test mocking Anthropic + Resend + Supabase

## Dev Notes

### Packages to Install

```bash
npm install @anthropic-ai/sdk inngest resend
```

- `@anthropic-ai/sdk` ^0.39+ — Claude Haiku calls with prompt caching
- `inngest` ^3.x — background job functions (cron + event-driven)
- `resend` ^4.x — transactional email

### New Env Vars (add to .env.example with placeholder values)

```
ANTHROPIC_API_KEY=
INNGEST_SIGNING_KEY=
INNGEST_EVENT_KEY=
# For retention cleanup only — bypasses RLS:
SUPABASE_SERVICE_ROLE_KEY=
```

### Auth Pattern (mandatory — same as all existing routes)

```ts
// Every route handler — no exceptions
import { createClient } from "@/utils/supabase/server";
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) return NextResponse.json({ error: { code: "UNAUTHORIZED", ... } }, { status: 401 });
```

Note: the import is `createClient` from `@/utils/supabase/server` (not `createServerClient`) — this is the actual code pattern established in all existing routes. Do NOT change it.

### lib/claude/client.ts Pattern

```ts
import Anthropic from "@anthropic-ai/sdk";
let _client: Anthropic | null = null;
export function getAnthropicClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}
```

### Prompt Caching Pattern (AC3 — mandatory)

The system prompt block MUST use `cache_control: { type: "ephemeral" }` on the last cache breakpoint:

```ts
// lib/claude/prompts.ts
export function buildBriefingPrompt(profile, goals, checkins, today) {
  return {
    system: [
      {
        type: "text" as const,
        text: SYSTEM_PROMPT,           // static — role, output format, safety rules, AI disclosure
        cache_control: { type: "ephemeral" as const },
      }
    ],
    messages: [
      {
        role: "user" as const,
        content: buildUserBlock(profile, goals, checkins, today),   // dynamic per request
      }
    ]
  };
}
```

Call:
```ts
const client = getAnthropicClient();
const response = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 1024,
  ...buildBriefingPrompt(profile, goals, checkins, today),
});
```

### Expected LLM Output Format

The system prompt should instruct Claude Haiku to return **structured JSON only** (no prose wrapper):

```json
{
  "greeting": "Opening personalised sentence for the email/card.",
  "suggestions": [
    {
      "domain": "health",
      "title": "One-line action",
      "body": "40–80 word coaching paragraph.",
      "action_link_text": "optional CTA label",
      "action_link_url": "optional deep link"
    }
  ],
  "observation": "optional — one open question, no CTA (used weekly by CoachesObservation)"
}
```

Store this JSON as-is in the `content` column. Story 4.2 reads and renders it.

### Safety Filter (lib/claude/safety.ts)

Single-pass string filter — no LLM re-call:

```ts
const BLOCKED_PATTERNS = [
  /\b[0-9]{3,4}\s*(kcal|calories?|cal)\b/i,  // caloric thresholds
  /stop\s+eating/i,
  /\b(buy|sell|invest in)\s+\w+\s+(stock|share|crypto|coin)/i,
];
const SAFE_FALLBACK = "Focus on consistency today — small steps compound.";

export function filterLlmOutput(content: string): { content: string; triggered: boolean } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) return { content: SAFE_FALLBACK, triggered: true };
  }
  return { content, triggered: false };
}
```

Apply to the full stringified JSON before storing. If triggered, replace the `body` of every suggestion with the fallback — not the entire JSON structure (so the UI still has domain/title).

### Inngest Function Pattern

```ts
// lib/inngest/client.ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "lifepilot" });

// lib/inngest/functions/generateBriefing.ts
import { inngest } from "../client";
export const generateBriefing = inngest.createFunction(
  { id: "generate-briefing" },
  [
    { cron: "0 * * * *" },                              // hourly — filters by briefing_time inside
    { event: "briefing/generate.requested" },           // on-demand trigger
  ],
  async ({ event, step }) => {
    // Use step.run() for each distinct unit of work (Inngest handles retry per step)
    const context = await step.run("fetch-context", async () => { /* ... */ });
    const content = await step.run("call-claude", async () => { /* ... */ });
    const filtered = await step.run("filter-output", async () => { /* ... */ });
    await step.run("store-briefing", async () => { /* ... */ });
    await step.run("send-email", async () => { /* ... */ });
  }
);
```

### Inngest Route Handler

```ts
// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { generateBriefing } from "@/lib/inngest/functions/generateBriefing";
import { retentionCleanup } from "@/lib/inngest/functions/retentionCleanup";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBriefing, retentionCleanup],
});
```

### Retention Cleanup — Service Role Client

`retentionCleanup` uses a Supabase service-role client (bypasses RLS) to delete across all users:

```ts
import { createClient } from "@supabase/supabase-js";
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Never** use the service-role client in any user-facing route handler. Only the Inngest function.

### Email Template Constraints (AC7)

- Plain HTML + inline CSS (not React Email or MJML) — matches existing project simplicity
- `max-width: 600px`, single column, no images in MVP
- Match web token colours: `#46876A` (sage/primary), `#E8923A` (accent/amber), `#FAF9F6` (background)
- Lora font for opening prose (use `font-family: Georgia, serif` as email fallback)
- Subject format exactly: `"Your [Weekday] — [one-line focus preview]"` e.g. `"Your Thursday — Stay on track with sleep"`
- Must include plain-text `text` alternative on every send (Resend accepts both `html` and `text`)

### Migration Notes

Migrations already in place: `001–005`. Next file: `006_briefings.sql`.
Do NOT use timestamp prefixes — existing migrations use sequential numbers (`001`, `002`, etc.) without timestamps.

The `helpful` column (`bool nullable`) is needed by Story 4.3 but define it now — null means unrated.

### Rate Limit File Location

Existing: `lib/rate-limit.ts` (flat, not `lib/rate-limit/auth.ts` as shown in architecture diagram). Import as `@/lib/rate-limit`. Do not restructure this — it would break existing imports.

### Briefing API Routes

**GET /api/briefing** — filter to last 30 days server-side:
```ts
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const { data } = await supabase
  .from("briefings")
  .select("id, briefing_date, content, email_status, helpful, safety_filter_triggered")
  .eq("user_id", user.id)
  .gte("briefing_date", thirtyDaysAgo.toISOString().split("T")[0])
  .order("briefing_date", { ascending: false });
```

**GET /api/briefing/[id]** — verify ownership via RLS (RLS already enforces `user_id = auth.uid()`). Return 404 if empty.

**PATCH /api/briefing/[id]** — accepts `{ helpful: true | false }`; validates with Zod; updates single row; Story 4.3 uses this.

### Logging Pattern (AC13 — no PII)

```ts
console.log(JSON.stringify({ event: "briefing_generated", userId: user.id, briefingDate }));
console.error(JSON.stringify({ event: "email_delivery_failed", userId: user.id, code: err.code }));
// NEVER: user.email, profile.name, suggestion body, health/financial data
```

### Project Structure Notes

New files:
```
lib/claude/client.ts
lib/claude/prompts.ts
lib/claude/safety.ts
lib/claude/__tests__/safety.test.ts
lib/claude/__tests__/prompts.test.ts
lib/inngest/client.ts
lib/inngest/functions/generateBriefing.ts
lib/inngest/functions/retentionCleanup.ts
lib/inngest/__tests__/generateBriefing.test.ts
lib/email/resend.ts
lib/email/templates/briefing.ts
app/api/inngest/route.ts
app/api/briefing/route.ts            (GET list)
app/api/briefing/[id]/route.ts       (GET single + PATCH helpfulness)
supabase/migrations/006_briefings.sql
```

No existing files need to be modified for this story (the `dashboard/page.tsx` update is Story 4.2).

### References

- Architecture: LLM Architecture section — prompt structure, model routing, safety filter
- Architecture: Inngest event naming convention — `{domain}/{entity}.{verb}`
- Architecture: Email module paths — `lib/email/resend.ts`, `lib/email/templates/briefing.ts`
- Architecture: Data flow diagram — `Inngest cron → POST /api/inngest → generateBriefing() → ...`
- Epics: Story 4.1 acceptance criteria (FR8–FR14)
- UX: UX-DR4 (email template constraints), UX-DR16 (AI disclosure in email footer)
- Sprint 3 patterns: all existing route handlers follow `createClient` + auth pattern from `@/utils/supabase/server`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
