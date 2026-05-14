---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure, step-07-validation, step-08-complete]
workflowType: architecture
lastStep: 8
status: complete
completedAt: '2026-05-14'
inputDocuments: [_bmad-output/planning-artifacts/prd.md, docs/project-brief.md, docs/architecture-overview.md]
workflowType: architecture
project_name: LifePilot
user_name: Ljuppa
date: '2026-05-14'
---

# Architecture Decision Document — LifePilot

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements — 32 FRs across 7 capability areas:**

| Capability Area | FR Count | Architectural Implication |
|---|---|---|
| User Account & Profile | 7 | Auth system, structured multi-domain profile schema |
| Daily Briefing | 7 | Async LLM pipeline, email delivery, storage, history |
| Manual Check-In | 5 | Multi-domain metric logging, offline queue + sync |
| Goal Progress & Insights | 4 | Streak computation, inactivity detection, weekly aggregation |
| Notifications & Communication | 3 | Email preference engine, unsubscribe management |
| Privacy & Data Control | 3 | Data export pipeline, consent tracking, audit log |
| Administration & Operations | 3 | Ops dashboard, privacy-scoped user lookup, broadcast |

**Non-Functional Requirements driving architecture:**

- **Performance:** LCP < 3s, API p95 < 1s, briefing pipeline < 60s end-to-end → serverless functions + edge-optimised DB queries + background job separation
- **LLM cost:** ≤ $0.05/user/day → prompt caching mandatory, Haiku for routine paths, model-switching strategy
- **Security:** TLS 1.3, AES-256 at rest, RLS per user, token rotation, OWASP Top 10 → enforced at infrastructure and DB layer
- **Compliance (EU + USA):** GDPR Art. 13/14/28/33, ePrivacy, EU AI Act, CAN-SPAM, COPPA, PCI DSS, multi-state US laws → compliance logic is first-class, not bolted on
- **Reliability:** 99.5% uptime, 3-retry briefing jobs, graceful email degradation → Inngest for durable job execution
- **Scalability:** 0→1,000 users with no infra changes → serverless auto-scaling, Supabase RLS handles multi-user isolation

**Scale & Complexity:**

- Complexity level: Medium-High
- Primary domain: Fullstack web app with async AI pipeline
- Estimated core architectural components: 8 (Auth, Profile, Briefing Engine, Check-in, Goal Tracker, Email, Admin, Compliance)

### Technical Constraints & Dependencies

- **Solo builder:** Architecture must be AI-agent-implementable in small, isolated stories — no complex distributed systems
- **Cost ceiling:** Free-tier infrastructure until ~500 users; LLM hard cap at $10/month
- **No iOS in MVP:** Architecture is web-first; iOS integration points designed but deferred to Phase 2
- **Anthropic API dependency:** Briefing quality is the core product risk; prompt engineering is a first-class architectural concern
- **Supabase RLS:** All data isolation enforced at DB level — critical safety net for AI-generated code

### Cross-Cutting Concerns

1. **Authentication & authorisation** — every API route and DB query must be session-scoped
2. **LLM cost management** — prompt caching, model routing (Haiku vs Sonnet), token budgeting
3. **Privacy & compliance** — GDPR/CCPA data handling across all write paths; consent gating; retention automation
4. **AI content labelling** — EU AI Act requires every LLM output visibly labelled in the UI
5. **Background job orchestration** — briefing pipeline is async, durable, retriable, and observable
6. **Email delivery** — transactional across 4 trigger points (briefing, re-engagement, export, breach notification)
7. **Observability without PII** — logs capture system health without exposing health/financial data
8. **Rate limiting** — auth endpoints and API routes protected against brute force

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack web application** — Next.js App Router (frontend + serverless API) with Supabase as the data/auth layer, deployed to Vercel.

### Starter Options Considered

| Option | Provides | Gap |
|---|---|---|
| `create-next-app` (bare) | Next.js, TypeScript, Tailwind, ESLint | Needs manual Supabase wiring, auth middleware |
| `create-next-app -e with-supabase` | Above + Supabase client, cookie-based auth, middleware, RLS-ready env setup | Best fit — minimal gap |
| T3 Stack (`create-t3-app`) | tRPC, Prisma, NextAuth | Over-engineered for MVP; complexity AI agents struggle with |

### Selected Starter: `create-next-app -e with-supabase`

**Rationale:** Pre-wires Supabase auth with cookie-based sessions (server-side safe), Next.js App Router middleware for route protection, and environment variable scaffolding — eliminating the most error-prone manual setup for an AI agent builder.

**Initialization Command:**

```bash
npx create-next-app -e with-supabase lifepilot
cd lifepilot
npx shadcn@latest init
```

**Architectural Decisions Provided by Starter:**

- **Language:** TypeScript strict mode — type safety critical for AI-generated code correctness
- **Styling:** Tailwind CSS v3 + shadcn/ui (accessible, Radix UI-based components)
- **Auth:** Cookie-based session management (secure, httpOnly); middleware pre-scaffolded for route protection
- **Environment:** `.env.local` template with Supabase keys pre-defined
- **Build:** Next.js 15 App Router, Turbopack (dev), ESLint pre-configured
- **Testing:** Not included — Vitest + React Testing Library added in first story

**Project Structure:**

```
lifepilot/
├── app/
│   ├── (auth)/           # Sign in, sign up, email verification
│   ├── (app)/            # Protected app routes
│   └── api/              # Route handlers (briefing, checkin, profile, goals)
├── components/           # Shared React components
├── lib/
│   ├── supabase/         # Server + client Supabase instances
│   ├── claude/           # LLM client + prompt builder
│   └── inngest/          # Job definitions
├── utils/                # Shared utilities
└── middleware.ts          # Auth route protection
```

> **Note:** Project initialisation is **Story 1 of Epic 1** in the implementation plan.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Zod validation schema strategy (affects all API routes and forms)
- Supabase CLI migration workflow (affects all DB stories)
- REST + standard error response format (affects all API stories)
- LLM prompt structure + caching (affects briefing engine — core product)

**Important Decisions (Shape Architecture):**
- Upstash rate limiting on auth endpoints
- RSC + SWR data fetching pattern
- react-hook-form + Zod form handling
- AI content disclosure labelling (EU AI Act compliance)
- Inngest nightly retention job (GDPR Art. 5 compliance)

**Deferred to Phase 2:**
- OpenAPI spec generation (needed when iOS client ships)
- Claude Sonnet model routing (cross-domain reasoning engine)
- Zustand (only if client state grows beyond useState scope)
- iOS API versioning strategy

### Data Architecture

**Validation strategy:** Zod — schemas defined once, used in both API Route Handlers and client forms via `react-hook-form` resolvers. Single source of truth; TypeScript inference flows from schema to component.

**Database access:** Direct Supabase client queries (no ORM). TypeScript types auto-generated from DB schema via `supabase gen types typescript` — run after every migration.

**Migration approach:** Supabase CLI (`supabase migration new <name>`) — SQL migration files committed to repo, applied via `supabase db push` in CI pipeline.

**Caching:** Next.js `unstable_cache` for infrequent server reads (e.g. user profile on dashboard). No Redis in MVP. Supabase PgBouncer connection pooling included free.

**Data retention automation:** Inngest scheduled job runs nightly — deletes check-ins older than 12 months, briefings older than 6 months. No pg_cron dependency.

### Authentication & Security

**Auth method:** Supabase Auth with cookie-based sessions (httpOnly, secure) — pre-wired by starter template. No JWT in localStorage.

**Route protection:** Next.js `middleware.ts` intercepts all `/(app)/*` routes, validates session cookie, redirects unauthenticated users to `/sign-in`.

**Rate limiting:** `@upstash/ratelimit` + Upstash Redis free tier (10k commands/day) on auth endpoints — sign-in limited to 5 requests per 15 minutes per IP.

**API security:** All Route Handlers call `createServerClient()` and verify session before any DB operation. RLS enforces per-user data isolation at DB level as a second defence layer.

**Audit logging:** `audit_logs` table — append-only, records consent events, data exports, account deletions, admin actions. No PII in log message fields.

### API & Communication Patterns

**Pattern:** REST via Next.js Route Handlers. No GraphQL or tRPC — REST is most AI-agent-friendly and sufficient for MVP data needs.

**Standard error response format:**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable description", "field": "optional_field_name" } }
```
HTTP status codes map consistently: 400 (validation), 401 (unauthenticated), 403 (unauthorised), 404 (not found), 500 (internal).

**API documentation:** TypeScript types as the contract in MVP. OpenAPI spec deferred to Phase 2 (iOS client requirement).

### Frontend Architecture

**Rendering strategy:** React Server Components for all initial data loads (profile, briefing, goals). Client components only for interactive elements (forms, real-time updates).

**State management:** `useState` / `useReducer` for local UI state only. No global state library in MVP (add Zustand in Phase 2 if needed).

**Forms:** `react-hook-form` + Zod resolvers — client-side validation mirrors server-side schemas. Consistent across all forms.

**Client-side data fetching:** SWR for polling and revalidation (briefing delivery status, check-in streak). Zero-config deduplication and revalidation on focus.

### LLM Architecture

**Prompt structure:**
```
[SYSTEM — cached prefix]
  Role: personal life agent
  Output format: structured JSON with suggestion array
  Safety rules: no clinical/financial advice language
  Disclosure: all output labelled as AI-generated

[USER — dynamic per request]
  User profile snapshot (age, goals, location)
  Active goal domains + targets
  Last 7 days check-in data
  Today's date and day of week
```

**Model routing:**
- Claude Haiku → all MVP daily briefing generation (routine, cost-optimised)
- Claude Sonnet → Phase 2 cross-domain recommendation fusion (complex reasoning)

**Prompt caching:** System prompt prefix cached via Anthropic prompt caching API. Cache TTL = 5 minutes. Target: ≥ 80% input token cost reduction on cached portion. Hard spend alert at $10/month in Anthropic console.

**Safety filter:** Server-side pattern filter on all LLM output before storage or delivery. Blocks specific caloric thresholds below 1200, "stop eating" language, specific investment recommendations, and harmful content patterns. Single-pass string filter — no secondary LLM call.

**AI content labelling (EU AI Act):** All briefing content rendered in UI with a non-dismissible footer: *"✦ AI-generated — not medical, nutritional, or financial advice."* Applied as a shared component wrapper on all LLM content surfaces.

### Infrastructure & Deployment

**Hosting:** Vercel (free Hobby tier). Serverless functions auto-scale — no infra changes needed from 0 to 1,000 users.

**CI/CD pipeline:**
```
PR opened → GitHub Actions (lint, type-check, Vitest, npm audit, Snyk)
          → Vercel Preview Deploy (unique URL per PR)
          → Human review
Merge to main → Vercel Production Deploy (zero-downtime, rollback in <2min)
```

**Environment management:** Vercel dashboard for production secrets. `.env.local` (gitignored) for local dev. `.env.example` committed with placeholder values.

**Monitoring:** Vercel Analytics (free) for web vitals. Inngest dashboard for job observability. Structured `console.log` in JSON format — no PII in log fields. Supabase dashboard for DB metrics.

**Compliance architecture:**
- Cookie consent: `react-cookie-consent` library — session cookies only in MVP; banner geo-targeted to EU users via Vercel Edge headers
- Data export: Inngest job generates JSON export → stores in Supabase Storage (signed URL, 1h expiry) → emails download link via Resend
- Audit log: `audit_logs` Supabase table, append-only, indexed on `user_id` and `event_type`

### Decision Impact Matrix

| Decision | Affects |
|---|---|
| Zod schemas | All API routes, all form stories |
| Supabase CLI migrations | All DB schema stories (Epic 1) |
| REST + error format | All API implementation stories |
| Upstash rate limiting | Auth epic |
| RSC + SWR pattern | All frontend stories |
| react-hook-form + Zod | All form stories |
| Haiku + prompt caching | Briefing engine story (Epic 2) |
| Safety filter | Briefing engine story |
| AI disclosure component | All briefing UI stories |
| Inngest retention job | Compliance story |
| Audit log table | Auth, export, admin stories |

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 6 areas where AI agents could make different choices without explicit rules.

---

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case` plural — `users`, `goals`, `briefings`, `checkins`, `audit_logs`, `notifications`
- Columns: `snake_case` — `user_id`, `created_at`, `briefing_date`, `email_status`
- Foreign keys: `{referenced_table_singular}_id` — `user_id`, `goal_id`
- Indexes: `idx_{table}_{column(s)}` — `idx_briefings_user_id`, `idx_checkins_user_id_date`
- Migrations: `{YYYYMMDDHHMMSS}_{descriptive_name}.sql` — `20260101120000_create_users.sql`

**API Naming Conventions:**
- Endpoints: `kebab-case`, plural resource noun — `/api/goals`, `/api/checkins`, `/api/briefings`
- Sub-resources: `/api/briefings/[id]/resend`
- Query params: `camelCase` — `?userId=`, `?startDate=`
- HTTP verbs map strictly: GET (read), POST (create), PATCH (partial update), DELETE (remove)
- No `/api/getUser` or verb-in-path patterns

**Code Naming Conventions:**
- Components: `PascalCase` — `BriefingCard.tsx`, `CheckinForm.tsx`
- Files: match export name — `BriefingCard.tsx` exports `BriefingCard`
- Functions: `camelCase` verbs — `getBriefing()`, `createCheckin()`, `sendBriefingEmail()`
- Hooks: `use` prefix — `useBriefingStatus()`, `useGoals()`
- Zod schemas: `{Entity}Schema` — `GoalSchema`, `CheckinSchema`
- Supabase types (generated): `Database['public']['Tables']['goals']['Row']` — never manual type duplication
- Route files: `route.ts` inside `app/api/{resource}/` folder

---

### Structure Patterns

**Project Organisation:**
```
app/
  (auth)/           # sign-in, sign-up, callback — unauthenticated routes
  (app)/            # all protected routes — wrapped by middleware
    dashboard/
    briefing/
    goals/
    checkin/
    profile/
    settings/
  api/
    briefing/
      route.ts      # GET list, POST trigger
      [id]/
        route.ts    # GET single
        resend/
          route.ts  # POST resend
    checkin/
    goals/
    profile/
    export/
    admin/
components/
  ui/               # shadcn/ui generated components — never manually edited
  briefing/         # feature-scoped components
  goals/
  checkin/
  shared/           # cross-feature shared components
lib/
  supabase/
    server.ts       # createServerClient()
    client.ts       # createBrowserClient()
    types.ts        # re-export of generated DB types
  claude/
    client.ts       # Anthropic SDK instance
    prompts.ts      # prompt builder functions
    safety.ts       # output filter
  inngest/
    client.ts       # Inngest instance
    functions/      # one file per job
  email/
    resend.ts       # Resend client
    templates/      # email template functions
  validation/       # Zod schemas — imported by both API routes and forms
    goal.ts
    checkin.ts
    profile.ts
utils/
  date.ts           # date formatting helpers
  errors.ts         # typed error constructors
middleware.ts       # auth route protection — single file, no splitting
```

**Test File Location:** Co-located with source — `BriefingCard.test.tsx` beside `BriefingCard.tsx`. Integration tests in `__tests__/` at project root.

---

### Format Patterns

**API Response Formats:**

Success (200/201):
```json
{ "data": { ... } }
```
Success list (200):
```json
{ "data": [...], "count": 42 }
```
Error (4xx/5xx):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable", "field": "optional" } }
```

**No naked returns** — never `return NextResponse.json(user)` directly, always wrap in `{ data: user }`.

**Data Exchange Formats:**
- JSON fields from API: `camelCase` — `userId`, `briefingDate`, `emailStatus`
- DB columns: `snake_case` (generated types handle mapping)
- Dates: ISO 8601 strings — `"2026-05-14T07:00:00Z"` — never Unix timestamps in API responses
- Nulls: explicit `null`, never `undefined` in API responses
- Booleans: `true`/`false` — never `1`/`0`

---

### Communication Patterns

**Inngest Event Naming:** `{domain}/{entity}.{verb}` (dot-separated, present tense)
- `briefing/generate.requested`
- `export/data.requested`
- `notification/reengagement.triggered`

**Event Payload Structure:**
```ts
{ userId: string, triggeredAt: string /* ISO */, ...domainSpecificFields }
```
Always include `userId` and `triggeredAt`. No PII beyond `userId` in event payloads.

**SWR Key Convention:** `['/api/{resource}', userId]` — array keys, never string concatenation.

---

### Process Patterns

**Error Handling:**
- Route Handlers: wrap entire handler body in `try/catch` → return standardised error JSON
- Server Components: use Next.js `error.tsx` boundary files per route segment
- Client components: SWR `error` state → inline error UI (no global toast for data errors)
- Auth errors (401): middleware catches and redirects — never handled inside route handlers
- Unrecoverable errors: `console.error(JSON.stringify({ event, userId, code }))` — no PII in log fields

**Loading States:**
- Server Components: use `loading.tsx` per route segment (Next.js Suspense integration)
- SWR fetches: `isLoading` boolean from `useSWR` hook → skeleton component pattern
- Form submissions: `isSubmitting` from `react-hook-form` → disabled submit button
- Naming: `isLoading`, `isSubmitting`, `isSending` — always `is` prefix boolean

**Validation Timing:**
- Server: always validate with Zod at the start of every Route Handler before any DB call
- Client: `react-hook-form` with same Zod schema as resolver — mirrors server validation
- Never trust client-side validation alone; server validation is authoritative

**Authentication Pattern in Route Handlers:**
```ts
// Every route handler follows this pattern — no exceptions
const supabase = createServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
// all DB queries below use user.id, never a client-passed userId
```

---

### Enforcement Guidelines

**All AI Agents MUST:**
- Generate Supabase types after every migration (`supabase gen types typescript`) — never write DB types manually
- Use the `lib/validation/` Zod schemas for both API and form validation — never define schemas inline
- Wrap every API response in `{ data: ... }` or `{ error: ... }` — no naked returns
- Verify session at the top of every Route Handler before any other operation
- Never log PII (email, name, health data) — log `userId` and event codes only
- Apply the `AiDisclosureWrapper` component to every surface that renders LLM content
- Use `snake_case` for DB columns and `camelCase` for API/TypeScript — never mix within a layer

**Pattern Enforcement:**
- ESLint rules enforce import paths (no relative imports outside module boundary)
- TypeScript strict mode catches type mismatches at compile time
- CI `type-check` step fails the build on any violation

**Good Examples:**
```ts
// ✅ Route Handler — correct pattern
export async function GET(req: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
  const goals = await supabase.from('goals').select('*').eq('user_id', user.id)
  return NextResponse.json({ data: goals.data })
}
```

**Anti-Patterns:**
```ts
// ❌ Never do this
return NextResponse.json(goals)                    // naked return — must wrap in { data: ... }
const userId = req.headers.get('x-user-id')        // trusting client-supplied identity
console.log('Error for user email:', user.email)   // PII in logs
const GoalSchema = z.object({ ... })               // inline schema — use lib/validation/goal.ts
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
lifepilot/
├── README.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example                    # committed — placeholder values only
├── .env.local                      # gitignored — real secrets
├── .gitignore
├── middleware.ts                   # auth route protection (single file)
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # lint → type-check → test → npm audit → Snyk
│
├── supabase/
│   ├── config.toml                 # Supabase CLI project config
│   └── migrations/                 # SQL migration files — committed to repo
│       ├── 20260101000000_create_users.sql
│       ├── 20260101000001_create_goals.sql
│       ├── 20260101000002_create_briefings.sql
│       ├── 20260101000003_create_checkins.sql
│       ├── 20260101000004_create_notifications.sql
│       └── 20260101000005_create_audit_logs.sql
│
├── app/
│   ├── globals.css
│   ├── layout.tsx                  # root layout — cookie consent banner
│   │
│   ├── (auth)/                     # unauthenticated routes
│   │   ├── sign-in/
│   │   │   └── page.tsx
│   │   ├── sign-up/
│   │   │   └── page.tsx
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts        # Supabase OAuth/magic link callback
│   │
│   ├── (app)/                      # all routes behind middleware auth guard
│   │   ├── layout.tsx              # app shell — nav, sidebar
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # FR: Daily Briefing — summary view
│   │   │   └── loading.tsx
│   │   ├── briefing/
│   │   │   ├── page.tsx            # briefing history list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx        # single briefing detail
│   │   │   └── loading.tsx
│   │   ├── checkin/
│   │   │   ├── page.tsx            # FR: Manual Check-In — entry form
│   │   │   └── loading.tsx
│   │   ├── goals/
│   │   │   ├── page.tsx            # FR: Goal Progress & Insights — goal list
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # create goal form
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx        # goal detail + streak
│   │   │   └── loading.tsx
│   │   ├── profile/
│   │   │   ├── page.tsx            # FR: User Account & Profile
│   │   │   └── loading.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx            # FR: Notifications & Communication preferences
│   │   │   └── loading.tsx
│   │   └── data/
│   │       └── page.tsx            # FR: Privacy & Data Control — export/delete
│   │
│   ├── admin/                      # FR: Administration & Operations
│   │   ├── layout.tsx              # admin auth guard (role check)
│   │   ├── page.tsx                # ops dashboard
│   │   ├── users/
│   │   │   └── page.tsx            # privacy-scoped user lookup
│   │   └── broadcast/
│   │       └── page.tsx            # broadcast message
│   │
│   └── api/
│       ├── briefing/
│       │   ├── route.ts            # GET /api/briefing — list history
│       │   ├── generate/
│       │   │   └── route.ts        # POST — Inngest trigger endpoint
│       │   └── [id]/
│       │       ├── route.ts        # GET single briefing
│       │       └── resend/
│       │           └── route.ts    # POST resend email
│       ├── checkin/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       └── route.ts        # PATCH update, DELETE remove
│       ├── goals/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts        # GET, PATCH, DELETE
│       │       └── progress/
│       │           └── route.ts    # GET streak + insights
│       ├── profile/
│       │   └── route.ts            # GET, PATCH
│       ├── notifications/
│       │   └── route.ts            # GET preferences, PATCH update
│       ├── export/
│       │   └── route.ts            # POST — trigger Inngest data export job
│       ├── unsubscribe/
│       │   └── route.ts            # GET — one-click email unsubscribe (CAN-SPAM)
│       ├── inngest/
│       │   └── route.ts            # POST — Inngest webhook receiver (all jobs)
│       └── admin/
│           ├── users/
│           │   └── route.ts        # GET user lookup (admin only)
│           └── broadcast/
│               └── route.ts        # POST send broadcast
│
├── components/
│   ├── ui/                         # shadcn/ui generated — never manually edited
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   └── ...
│   ├── shared/
│   │   ├── AiDisclosureWrapper.tsx # wraps all LLM content surfaces
│   │   ├── Nav.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── SkeletonCard.tsx
│   │   └── CookieConsentBanner.tsx
│   ├── briefing/
│   │   ├── BriefingCard.tsx
│   │   ├── BriefingCard.test.tsx
│   │   └── BriefingStatusBadge.tsx
│   ├── checkin/
│   │   ├── CheckinForm.tsx
│   │   ├── CheckinForm.test.tsx
│   │   └── MoodSlider.tsx
│   ├── goals/
│   │   ├── GoalCard.tsx
│   │   ├── GoalCard.test.tsx
│   │   ├── GoalForm.tsx
│   │   ├── StreakBadge.tsx
│   │   └── InsightPanel.tsx
│   └── profile/
│       ├── ProfileForm.tsx
│       └── ProfileForm.test.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # createServerClient() — used in Route Handlers + RSC
│   │   ├── client.ts               # createBrowserClient() — used in Client Components
│   │   └── types.ts                # re-export of supabase gen types typescript output
│   ├── claude/
│   │   ├── client.ts               # Anthropic SDK instance (singleton)
│   │   ├── prompts.ts              # buildBriefingPrompt() — system + user blocks
│   │   └── safety.ts               # filterLlmOutput() — pattern-based filter
│   ├── inngest/
│   │   ├── client.ts               # Inngest instance
│   │   └── functions/
│   │       ├── generateBriefing.ts # nightly briefing per user
│   │       ├── exportUserData.ts   # GDPR data export job
│   │       └── retentionCleanup.ts # nightly deletion: checkins >12mo, briefings >6mo
│   ├── email/
│   │   ├── resend.ts               # Resend client instance
│   │   └── templates/
│   │       ├── briefing.ts         # daily briefing email template
│   │       ├── reengagement.ts     # re-engagement nudge template
│   │       ├── dataExport.ts       # export ready notification template
│   │       └── breach.ts           # data breach notification template (GDPR Art. 33)
│   ├── rate-limit/
│   │   └── auth.ts                 # Upstash ratelimit — 5 req/15min per IP
│   └── validation/                 # Zod schemas — single source of truth
│       ├── goal.ts                 # GoalSchema
│       ├── checkin.ts              # CheckinSchema
│       ├── profile.ts              # ProfileSchema
│       ├── notification.ts         # NotificationPreferencesSchema
│       └── admin.ts                # AdminBroadcastSchema
│
├── utils/
│   ├── date.ts                     # ISO formatting, timezone helpers
│   ├── errors.ts                   # typed AppError constructors
│   └── cn.ts                       # shadcn className merge utility
│
└── __tests__/                      # integration tests (hit real Supabase test project)
    ├── api/
    │   ├── briefing.test.ts
    │   ├── checkin.test.ts
    │   └── goals.test.ts
    └── inngest/
        └── generateBriefing.test.ts
```

### Architectural Boundaries

**API Boundaries:**
- All public API routes live under `app/api/` — no business logic inline, always delegates to `lib/`
- Admin routes (`app/api/admin/`) verify `user.role === 'admin'` after session check — separate guard from regular auth
- Inngest webhook receiver (`app/api/inngest/route.ts`) is the single entry point for all background jobs — never called directly by the frontend
- Unsubscribe endpoint (`app/api/unsubscribe/`) is unauthenticated by design — validates a signed token in the query param (CAN-SPAM one-click compliance)

**Component Boundaries:**
- `components/ui/` — owned by shadcn/ui CLI; never manually edited; regenerated on upgrade
- `components/shared/` — used across features; no feature-specific imports allowed
- `components/{feature}/` — feature-scoped; may import from `shared/` and `ui/`, never from sibling features
- `AiDisclosureWrapper` — mandatory wrapper for any JSX that renders LLM output; enforced in code review

**Data Boundaries:**
- `lib/supabase/server.ts` is the only place `createServerClient()` is called
- `lib/supabase/client.ts` is the only place `createBrowserClient()` is called
- No component or route handler constructs a Supabase client directly
- All DB types flow from `lib/supabase/types.ts` (generated); never duplicated manually

### Requirements to Structure Mapping

| Capability Area (PRD) | Primary Location |
|---|---|
| User Account & Profile (FR01–FR07) | `app/(app)/profile/`, `app/api/profile/`, `lib/validation/profile.ts` |
| Daily Briefing (FR08–FR14) | `app/(app)/briefing/`, `app/api/briefing/`, `lib/claude/`, `lib/inngest/functions/generateBriefing.ts`, `lib/email/templates/briefing.ts` |
| Manual Check-In (FR15–FR19) | `app/(app)/checkin/`, `app/api/checkin/`, `lib/validation/checkin.ts` |
| Goal Progress & Insights (FR20–FR23) | `app/(app)/goals/`, `app/api/goals/`, `lib/validation/goal.ts` |
| Notifications & Communication (FR24–FR26) | `app/(app)/settings/`, `app/api/notifications/`, `app/api/unsubscribe/`, `lib/email/templates/reengagement.ts` |
| Privacy & Data Control (FR27–FR29) | `app/(app)/data/`, `app/api/export/`, `lib/inngest/functions/exportUserData.ts`, `lib/inngest/functions/retentionCleanup.ts` |
| Administration & Operations (FR30–FR32) | `app/admin/`, `app/api/admin/` |

**Cross-Cutting Concerns:**

| Concern | Location |
|---|---|
| Auth session verification | `middleware.ts` (route protection) + top of every Route Handler |
| Cookie consent | `components/shared/CookieConsentBanner.tsx` in root `app/layout.tsx` |
| AI disclosure | `components/shared/AiDisclosureWrapper.tsx` |
| Audit log writes | `lib/supabase/server.ts` audit helper (called from relevant Route Handlers) |
| Rate limiting | `lib/rate-limit/auth.ts` (imported by sign-in / sign-up Route Handlers) |
| PII-free logging | `utils/errors.ts` — all error constructors strip PII before `console.error` |
| Zod validation | `lib/validation/` — imported by both Route Handlers and `react-hook-form` resolvers |

### Integration Points

**External Integrations:**

| Service | Integration Point | Direction |
|---|---|---|
| Supabase Auth | `middleware.ts`, every Route Handler | App → Supabase |
| Supabase DB | `lib/supabase/server.ts` + `client.ts` | App → Supabase |
| Anthropic Claude | `lib/claude/client.ts` | App → Anthropic |
| Resend | `lib/email/resend.ts` | App → Resend |
| Inngest | `app/api/inngest/route.ts` (inbound), `lib/inngest/client.ts` (outbound events) | Bidirectional |
| Upstash Redis | `lib/rate-limit/auth.ts` | App → Upstash |

**Data Flow — Daily Briefing:**
```
Inngest cron → POST /api/inngest → generateBriefing()
  → lib/supabase/server.ts (fetch profile + goals + check-ins)
  → lib/claude/prompts.ts (build prompt)
  → lib/claude/client.ts (call Haiku API)
  → lib/claude/safety.ts (filter output)
  → lib/supabase/server.ts (store briefing record)
  → lib/email/templates/briefing.ts (build email)
  → lib/email/resend.ts (send email)
  → lib/supabase/server.ts (update email_status = delivered)
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are mutually compatible with Next.js 15 App Router as the integration point. Supabase's `@supabase/ssr` package is the purpose-built companion for Next.js cookie-based auth — no conflicts. Inngest's HTTP-based webhook model works natively with Vercel serverless functions. Upstash Redis (serverless, HTTP-based) is the only Redis client that works in Vercel Edge/serverless without persistent connections. SWR is React-library-agnostic and composes cleanly with RSC — no overlap between RSC data fetching and SWR client polling. `react-hook-form` + Zod resolvers is the de-facto Next.js pattern; both libraries are at stable major versions with no compatibility issues.

**Pattern Consistency:**
Naming conventions are internally consistent: `snake_case` at the DB layer, `camelCase` at the TypeScript/API layer, `PascalCase` for React components. The transition points (Supabase generated types, Zod schema inference) handle the boundary automatically. The authentication pattern (session check at Route Handler entry) is uniform and referenced by structure (`lib/supabase/server.ts` as the single import point). Error response format is defined once and applied everywhere.

**Structure Alignment:**
The project directory structure directly mirrors the architectural decisions: `lib/validation/` reflects the Zod-single-source-of-truth decision; `lib/supabase/server.ts` and `client.ts` enforce the single-client-constructor rule; `components/ui/` is isolated for shadcn/ui to prevent manual edits. The Inngest function-per-file structure in `lib/inngest/functions/` directly maps to the three identified background jobs (generate, export, retention).

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (32 FRs):**

| Capability Area | FRs | Architectural Coverage |
|---|---|---|
| User Account & Profile | FR01–FR07 | Supabase Auth + `app/api/profile/` + `ProfileSchema` |
| Daily Briefing | FR08–FR14 | `lib/claude/` + `lib/inngest/functions/generateBriefing.ts` + `lib/email/templates/briefing.ts` |
| Manual Check-In | FR15–FR19 | `app/(app)/checkin/` + `app/api/checkin/` + `CheckinSchema` |
| Goal Progress & Insights | FR20–FR23 | `app/(app)/goals/` + `app/api/goals/[id]/progress/` + streak computation in `lib/` |
| Notifications & Communication | FR24–FR26 | `app/api/notifications/` + `app/api/unsubscribe/` + `lib/email/templates/reengagement.ts` |
| Privacy & Data Control | FR27–FR29 | `lib/inngest/functions/exportUserData.ts` + `retentionCleanup.ts` + `audit_logs` table |
| Administration & Operations | FR30–FR32 | `app/admin/` + `app/api/admin/` |

**Non-Functional Requirements Coverage (40 NFRs):**

| NFR Category | Coverage Mechanism |
|---|---|
| Performance (LCP <3s, API p95 <1s) | RSC server-side rendering, Next.js `unstable_cache`, Supabase PgBouncer, Vercel Edge CDN |
| LLM cost (≤$0.05/user/day) | Claude Haiku, Anthropic prompt caching (≥80% input token reduction), hard spend alert at $10/month |
| Security (TLS 1.3, AES-256, RLS, OWASP Top 10) | Vercel TLS auto, Supabase at-rest encryption, RLS per user, `@upstash/ratelimit` on auth, httpOnly session cookies |
| GDPR compliance | Audit log, data export job, retention deletion job, cookie consent banner, DSAR support via export endpoint |
| EU AI Act | Non-dismissible `AiDisclosureWrapper` on all LLM surfaces |
| CAN-SPAM / ePrivacy | Signed-token unsubscribe endpoint, preference management in settings |
| Reliability (99.5%, 3-retry briefing) | Inngest durable execution with built-in retry, Vercel 99.99% SLA |
| Scalability (0→1,000 users, no infra changes) | Vercel serverless auto-scale, Supabase connection pooling |

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical decisions are documented with specific package names and patterns. The starter command is exact (`npx create-next-app -e with-supabase lifepilot`). Model routing (Haiku vs Sonnet), prompt structure, and safety filter approach are specified. Migration workflow is step-by-step.

**Structure Completeness:** The directory tree names every file an AI agent will need to create in Epic 1, including migration files, lib singletons, and the Inngest receiver endpoint. Boundary rules are explicit.

**Pattern Completeness:** All 6 identified conflict categories (naming, structure, format, communication, process, auth) have explicit rules with good and anti-pattern examples. The mandatory Route Handler auth pattern is given as a copy-paste template.

### Gap Analysis Results

**Critical Gaps:** None.

**Important Gaps (addressed at story level):**

1. **Unsubscribe token signing** — Use HMAC-SHA256 with `UNSUBSCRIBE_SECRET` env var; token = `HMAC(userId + email)`, embedded in Resend email templates at send time. Acceptance criterion for the notifications story.
2. **Supabase Storage bucket policy for exports** — `exports` bucket must be private (no public access); only signed URLs (1-hour expiry) returned. RLS policy: `SELECT` allowed only where `user_id = auth.uid()`. Acceptance criterion for the data export story.

**Nice-to-Have Gaps:** Playwright E2E tests (Phase 2 pre-iOS); structured log aggregation (Axiom or similar, if observability needs grow).

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (32 FRs, 40 NFRs across 7 capability areas)
- [x] Scale and complexity assessed (medium-high, 0→1,000 users serverless)
- [x] Technical constraints identified (solo builder, cost ceiling, no iOS in MVP)
- [x] Cross-cutting concerns mapped (8 concerns documented)

**Architectural Decisions**
- [x] Critical decisions documented with versions (Next.js 15, Supabase, Inngest, Resend, Claude Haiku)
- [x] Technology stack fully specified (starter command, all packages named)
- [x] Integration patterns defined (REST, Inngest webhook, Supabase RLS)
- [x] Performance considerations addressed (RSC, prompt caching, PgBouncer, Vercel Edge)

**Implementation Patterns**
- [x] Naming conventions established (DB snake_case, API camelCase, PascalCase components)
- [x] Structure patterns defined (co-located tests, feature-scoped components, lib singletons)
- [x] Communication patterns specified (Inngest event naming, SWR key convention)
- [x] Process patterns documented (Route Handler auth, error handling, loading states, validation timing)

**Project Structure**
- [x] Complete directory structure defined (every file named)
- [x] Component boundaries established (ui/shared/feature isolation rules)
- [x] Integration points mapped (all 6 external services)
- [x] Requirements to structure mapping complete (all 7 FR capability areas mapped)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level:** High

**Key Strengths:**
- Every decision is optimised for a solo AI-agent builder: REST over tRPC, monolith over microservices, Supabase RLS as safety net for AI-generated code
- Cost ceiling is structurally enforced: entirely free-tier infrastructure + Haiku + prompt caching keeps MVP at ~$2–5/month
- Compliance is first-class: GDPR, EU AI Act, CAN-SPAM have specific architectural artefacts (not bolted on)
- Six-conflict-category pattern set gives AI agents unambiguous rules preventing the most common consistency failures

**Areas for Future Enhancement (Phase 2):**
- OpenAPI spec generation (required when iOS client ships)
- Claude Sonnet model routing for cross-domain recommendation fusion
- Playwright E2E test suite
- Structured log aggregation (Axiom or similar)
- Zustand global state (only if client state complexity grows beyond `useState`)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — no improvisation on tech choices
- Use `lib/validation/` Zod schemas for every new form or API route — never define schemas inline
- Respect component boundary rules: `ui/` is read-only, `shared/` is cross-feature, `{feature}/` is isolated
- Apply `AiDisclosureWrapper` to every surface that renders LLM content — no exceptions
- Run `supabase gen types typescript` after every migration before writing any DB query code
- Refer to the Route Handler auth pattern template for every new API route

**First Implementation Priority:**
```bash
npx create-next-app -e with-supabase lifepilot
cd lifepilot
npx shadcn@latest init
```
Then Epic 1, Story 1: project initialisation, environment scaffolding, and CI pipeline setup.
