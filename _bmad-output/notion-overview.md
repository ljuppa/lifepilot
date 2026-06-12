---
title: "Prj: LifePilot — Notion Overview"
created: "2026-06-12"
purpose: "Copy-paste content for Notion. One section per Notion page."
target_page: "https://app.notion.com/p/Engineering-Manager-Upskilling-Hub-0ecb80189fc34c0196ebedff991d4bd8"
---

<!--
  ════════════════════════════════════════════════════════════
  HOW TO USE
  ════════════════════════════════════════════════════════════
  1. Open the target Notion workspace above
  2. Create a new page named "Prj: LifePilot"
  3. Copy the MAIN PAGE content first (table of subpages)
  4. Create each subpage listed in the table, copying its content
  5. Link each subpage back from the main table

  Each section below is clearly delimited with ═══ borders.
  ════════════════════════════════════════════════════════════
-->

---

# ════════════════════════════════════════════════════
# MAIN PAGE: "Prj: LifePilot"
# ════════════════════════════════════════════════════

# Prj: LifePilot

**Status:** 🟡 Active — Sprint 6 in progress  
**Builder:** Ljuppa  
**Started:** May 2026  
**Stack:** Next.js · Supabase · Claude · Inngest · Vercel

---

## What is it?

LifePilot is a proactive, cross-domain AI life agent. It sends a personalised morning briefing every day — no prompting required — by combining mood history, goals, check-in data, and life context into one unified view. The core bet: your life is a system, not a set of siloed apps.

**Differentiator:** Every competitor (MyFitnessPal, YNAB, Calm) operates in one domain and waits for the user. LifePilot acts across all goals simultaneously — one briefing that optimises health, finance, and wellness at once.

---

## Subpages

| Page | Description | Status |
|------|-------------|--------|
| [[01 — Product Overview]] | PRD summary, success criteria, phase scope | ✅ Complete |
| [[02 — Technology & Architecture]] | Tech stack, ADRs, folder structure, patterns | ✅ Complete |
| [[03 — Epics & Sprint Progress]] | All epics, stories, sprint history | 🟡 Sprint 6 active |
| [[04 — Health Direction & Ideas]] | Brainstorming session, 24 ideas, 3 priorities | ✅ Complete |
| [[05 — PRFAQ: LifePilot Health]] | Press release stress-test (Working Backwards) | 🟡 Stage 2 in progress |

---

## Quick Status

| Metric | Value |
|--------|-------|
| Epics complete | 5 of 7 |
| Stories done | 15 |
| Stories in review | 1 (6.1 Personal Data Export) |
| Stories backlog | 5 |
| Current sprint | Epic 6 — Privacy, Data Control & Compliance |
| Next major milestone | Epic 7 — Administration & Operations |

---
---

# ════════════════════════════════════════════════════
# SUBPAGE 1: "01 — Product Overview"
# ════════════════════════════════════════════════════

# 01 — Product Overview

**Source:** `_bmad-output/planning-artifacts/prd.md`  
**PRD Status:** Complete · Architecture Defined · Implementation ~75% done

---

## Executive Summary

LifePilot is a proactive, cross-domain AI life agent for web (MVP) and iOS (Phase 2). Users configure a full life profile — body metrics, budget, location, relationship status, and goals — and the agent acts daily without being prompted.

**Core problem:** Not lack of tracking tools — lack of *agency*. LifePilot replaces passive dashboards with an active agent: morning briefings, personalised recipes, budget-matched suggestions, fitness routines — automatically, every day.

| Attribute | Value |
|-----------|-------|
| Project Type | Consumer Web App (MVP) → Native iOS (Phase 2) |
| Domain | Consumer Wellness & Personal Productivity |
| AI Engine | Claude Haiku (daily briefings) · Claude Sonnet (Phase 2 fusion) |
| Builder | Solo — engineering manager + BMAD agentic AI team |
| MVP Cost Target | < $5/month (0–50 users) |
| LLM Cost Cap | $0.05/user/day · $10/month hard alert |

---

## Target User

Goal-oriented adults (25–45) managing multiple life dimensions simultaneously but lacking bandwidth to coordinate across siloed apps. The builder (Ljuppa) is the primary persona — ambitious, married, busy, struggling to make health a priority, seeking self-awareness without effort.

---

## Success Criteria

### User Success
- **Daily engagement:** 60%+ complete a daily check-in 5+ days/week within first 30 days
- **Goal progress:** 70%+ show measurable progress on ≥1 goal within 30 days
- **Aha! moment:** First cross-domain recommendation within 24h of profile setup
- **60-day retention:** 40%+ remain active at 60 days post-signup
- **Agent trust:** 50%+ act on an agent suggestion in their first week

### Business Success (12-month targets)
- 25,000 active users
- Daily briefing email open rate ≥ 45%
- Freemium model validated ($9.99/month premium tier)
- 20%+ new signups from referral by month 6

### Technical Success
- Briefing generated and delivered within 60 seconds of scheduled time
- API and web app availability ≥ 99.5% monthly
- Zero user health or financial data shared with third parties

---

## Phase 1 — MVP (Web, ~3 months)

**Goal:** Prove the daily briefing loop before building the recommendation engine.

**In scope:**
- Web app (responsive, Next.js)
- User account + profile setup (body basics, budget, 1–3 goals)
- Daily AI briefing — LLM-generated, emailed at configured time
- Manual check-in: mood, one health metric, one finance metric, one wellness metric
- Goal progress display + daily check-in streak
- Re-engagement nudge email after 48h inactivity
- User data export and account deletion (GDPR/CCPA)

**Explicitly deferred to Phase 2:**
- Native iOS app
- Apple Health / Fitbit integration
- Cross-domain recommendation fusion engine
- Calendar integration, travel and dating domains
- Push notifications (email replaces in MVP)
- Admin dashboard, subscription/payments

---

## Measurable Outcome Targets

| Metric | 30-Day | 90-Day |
|--------|--------|--------|
| Daily check-in rate | 50% | 60% |
| Cross-domain suggestions acted on | 40% | 55% |
| 7-day retention | 55% | 65% |
| 60-day retention | 35% | 45% |
| Daily briefing email open rate | 40% | 50% |

---
---

# ════════════════════════════════════════════════════
# SUBPAGE 2: "02 — Technology & Architecture"
# ════════════════════════════════════════════════════

# 02 — Technology & Architecture

**Source:** `_bmad-output/planning-artifacts/architecture.md`  
**Status:** Complete · 10 ADRs locked · All patterns enforced in CI

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 16 App Router** | RSC + serverless API in one repo; App Router for route groups and middleware |
| Language | **TypeScript (strict mode)** | Type safety critical for AI-generated code correctness |
| Styling | **Tailwind CSS v3 + shadcn/ui** | Accessible Radix UI components; never manually edited |
| Database | **Supabase (Postgres + RLS)** | Row-level security enforced at DB layer — critical safety net |
| Auth | **Supabase Auth** | Cookie-based sessions (secure, httpOnly); pre-scaffolded middleware |
| Storage | **Supabase Storage** | Private `exports` bucket for GDPR data export; signed URLs (1h expiry) |
| AI / LLM | **Anthropic Claude** | Haiku for daily briefings (cost-optimised); Sonnet for Phase 2 reasoning |
| Background Jobs | **Inngest v4** | Durable, retriable job execution; `step.run()` pattern for fault tolerance |
| Email | **Resend** | Transactional email — briefings, re-engagement, export, breach notification |
| Rate Limiting | **Upstash Redis** | Auth endpoint protection against brute force |
| Validation | **Zod** | Shared schemas between API routes and react-hook-form |
| Forms | **react-hook-form** | Zod resolvers mirror server validation |
| Data Fetching | **SWR** | Client-side RSC + SWR pattern; `['/api/{resource}', userId]` array keys |
| Hosting | **Vercel (Hobby)** | Serverless auto-scale; 0→1,000 users with no infra changes |
| CI/CD | **GitHub Actions** | lint → type-check → Vitest → npm audit → Snyk → Vercel preview deploy |
| Testing | **Vitest** | Co-located unit tests; integration tests in `__tests__/` at root |

---

## Initialization

```bash
npx create-next-app -e with-supabase lifepilot
cd lifepilot
npx shadcn@latest init
```

Starter chosen: `create-next-app -e with-supabase` — pre-wires Supabase auth with cookie-based sessions, middleware for route protection, and `.env.local` scaffolding.

---

## Key Architecture Decisions (ADRs)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | App Router vs Pages Router | **App Router** | RSC reduces client bundle; route groups for auth/app split |
| 2 | Auth system | **Supabase Auth** (not NextAuth) | Native RLS integration; cookie-based sessions are server-safe |
| 3 | Middleware pattern | **`proxy.ts`** (not `middleware.ts`) | Avoids Edge runtime conflicts with Supabase SSR client |
| 4 | Validation | **Zod** shared schemas in `lib/validation/` | Single source of truth for API and forms |
| 5 | Background jobs | **Inngest v4** | Durable execution, retry logic, observable — no DIY job queue |
| 6 | LLM model routing | **Haiku (MVP) → Sonnet (Phase 2)** | Haiku + prompt caching = ≥80% token cost reduction; hard cap $0.05/user/day |
| 7 | Safety filter | **Server-side pattern filter** (no secondary LLM) | Blocks caloric thresholds <1200, "stop eating" language, harmful patterns — single-pass, cheap |
| 8 | Data format | **REST + standardised JSON envelope** | `{ data: ... }` or `{ error: { code, message } }` — no naked returns, no tRPC/GraphQL |
| 9 | Email | **Resend** | Simple transactional API; no SMTP config; 4 trigger points wired |
| 10 | Compliance architecture | **Inngest export job + audit_logs table** | GDPR Art. 17: export via signed URL; audit log append-only, indexed on `user_id` |

---

## Folder Structure (Key Areas)

```
app/
  (auth)/       → sign-in, sign-up, callback (unauthenticated)
  (app)/        → all protected routes behind middleware
    dashboard/  → Today view + daily briefing
    briefing/   → Briefing history + detail
    checkin/    → Daily check-in form
    goals/      → Goal list, detail, streak
    profile/    → User profile
    settings/   → Notification preferences
    data/       → Privacy & data export (GDPR)
  api/          → Route handlers (REST)
    briefing/   → GET history, POST trigger
    checkin/    → GET/POST/PATCH/DELETE
    goals/      → GET/POST + progress sub-route
    export/     → POST trigger data export
    unsubscribe/→ GET one-click unsubscribe (CAN-SPAM)
    inngest/    → POST webhook receiver (all background jobs)
    admin/      → User lookup, broadcast

lib/
  supabase/     → server.ts, client.ts, types.ts
  claude/       → client.ts, prompts.ts, safety.ts
  inngest/      → client.ts + functions/ (one file per job)
  email/        → resend.ts + templates/
  validation/   → Zod schemas (goal.ts, checkin.ts, profile.ts)

components/
  ui/           → shadcn/ui generated — NEVER manually edited
  shared/       → AiDisclosureWrapper, Nav, Sidebar, ErrorBoundary
  briefing/     → feature-scoped components
  goals/
  checkin/
```

---

## Inngest Background Jobs

| Job ID | Trigger Event | Purpose |
|--------|---------------|---------|
| `generate-briefing` | `briefing/generate.requested` | Claude Haiku pipeline → email via Resend |
| `retention-cleanup` | `retention/cleanup.scheduled` | Delete data older than retention window (GDPR Art.5) |
| `check-inactivity` | `notification/check-inactivity` | Detect 48h inactivity → re-engagement email |
| `export-user-data` | `export/data.requested` | Fetch all user data → upload to Storage → email signed URL |

---

## Critical Patterns (Enforced in CI)

**Every route handler:**
```ts
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
// All DB queries use user.id — never a client-supplied userId
```

**Every API response:**
```ts
return NextResponse.json({ data: result })      // success
return NextResponse.json({ error: { code, message } }, { status: 4xx })  // error
// NEVER: return NextResponse.json(result)  ← naked return is banned
```

**LLM content:** Every surface that renders LLM output is wrapped in `AiDisclosureWrapper` — non-dismissible footer: *"✦ AI-generated — not medical, nutritional, or financial advice."* (EU AI Act compliance)

**Logs:** `console.log(JSON.stringify({ event, userId, code }))` — no PII (email, name, health data) in any log field.

---

## Non-Functional Requirements Summary

| NFR | Target | How |
|-----|--------|-----|
| Briefing latency | < 60s end-to-end | Inngest async + Supabase edge queries |
| LLM cost | ≤ $0.05/user/day | Haiku + prompt caching (≥80% reduction) |
| API p95 | < 1s | Serverless + indexed DB queries |
| Availability | ≥ 99.5% monthly | Vercel auto-scale + Inngest 3-retry policy |
| Data isolation | Per-user | Supabase RLS on every table |
| Security | OWASP Top 10 | TLS 1.3, AES-256 at rest, Upstash rate limiting, cookie-based auth |
| Compliance | GDPR + CAN-SPAM + EU AI Act | Audit log, data export pipeline, unsubscribe route, AI disclosure |

---
---

# ════════════════════════════════════════════════════
# SUBPAGE 3: "03 — Epics & Sprint Progress"
# ════════════════════════════════════════════════════

# 03 — Epics & Sprint Progress

**Source:** `_bmad-output/implementation-artifacts/sprint-status.yaml`  
**Last Updated:** 2026-05-15

---

## Sprint Summary

| Sprint | Epic | Theme | Status |
|--------|------|-------|--------|
| 1 | Epic 1 | Foundation & Authenticated Access | ✅ Done |
| 2 | Epic 2 | Life Profile & Goal Configuration | ✅ Done |
| 3 | Epic 3 | Daily Check-In | ✅ Done |
| 4 | Epic 4 | Daily Briefing Engine | ✅ Done |
| 5 | Epic 5 | Goal Progress, Insights & Re-engagement | ✅ Done |
| 6 | Epic 6 | Privacy, Data Control & Compliance | 🟡 In Progress |
| — | Epic 7 | Administration & Operations | ⬜ Backlog |

---

## Epic 1 — Foundation & Authenticated Access ✅

| Story | Title | Status |
|-------|-------|--------|
| 1.1 | Project Scaffold and Deployment Foundation | ✅ Done |
| 1.2 | User Sign-Up with Email and Password | ✅ Done |
| 1.3 | Email Verification and Authenticated Sign-In | ✅ Done |

**Sprint notes:** Auth scaffold, CI/CD pipeline, design tokens, Supabase auth flow, Next.js middleware.

---

## Epic 2 — Life Profile & Goal Configuration ✅

| Story | Title | Status |
|-------|-------|--------|
| 2.1 | Onboarding Wizard: Profile, Goals and Consent | ✅ Done |
| 2.2 | Profile and Goal Editing | ✅ Done |

**Sprint notes:** Onboarding wizard, profile editing, goals management. 120 tests passing.

---

## Epic 3 — Daily Check-In ✅

| Story | Title | Status |
|-------|-------|--------|
| 3.1 | Daily Check-In Form | ✅ Done |
| 3.2 | Offline Check-In Queue and Sync | ✅ Done |

**Sprint notes:** `CheckinSchema`, `MoodSelector`, offline queue (localStorage + exponential backoff), phase state machine, 5 Supabase migrations.

---

## Epic 4 — Daily Briefing Engine ✅

| Story | Title | Status |
|-------|-------|--------|
| 4.1 | Briefing Generation and Email Delivery Pipeline | ✅ Done |
| 4.2 | Today View and Briefing Display | ✅ Done |
| 4.3 | Briefing History and Helpfulness Feedback | ✅ Done |

**Sprint notes:** Claude Haiku pipeline, Inngest v4 functions, Resend email, safety filter, briefings table, REST API, `AiDisclosureWrapper`, `BriefingCard`, dashboard, briefing history list + detail, helpfulness feedback UI (thumbs up/down). 276 tests passing. Code reviewed — 6 patches applied.

---

## Epic 5 — Goal Progress, Insights & Re-engagement ✅

| Story | Title | Status |
|-------|-------|--------|
| 5.1 | Goal Progress and Check-In Streak | ✅ Done |
| 5.2 | Weekly Summary | ✅ Done |
| 5.3 | Inactivity Detection and Re-engagement Email | ✅ Done |
| 5.4 | Notification Preferences and Unsubscribe | ✅ Done |

**Sprint notes:** Streak computation, weekly aggregation, Inngest inactivity detection, HMAC unsubscribe tokens (`sha256(userId:type)`), CAN-SPAM compliant one-click unsubscribe route.

---

## Epic 6 — Privacy, Data Control & Compliance 🟡

| Story | Title | Status |
|-------|-------|--------|
| 6.1 | Personal Data Export | 🔵 In Review |
| 6.2 | Data Summary and Account Deletion | ⬜ Backlog |
| 6.3 | Automated Data Retention | ⬜ Backlog |

**Sprint notes (6.1):** Inngest `export-user-data` function, Supabase Storage `exports` bucket (private, RLS), `DataExport` email template (Resend), `/api/export` REST route, `/data` page (idle/loading/success/error states). GDPR Art. 17 compliant.

---

## Epic 7 — Administration & Operations ⬜

| Story | Title | Status |
|-------|-------|--------|
| 7.1 | Operator Metrics Dashboard | ⬜ Backlog |
| 7.2 | Per-User Email Delivery Lookup | ⬜ Backlog |
| 7.3 | System-Wide Broadcast | ⬜ Backlog |

---

## Overall Counts

| Metric | Count |
|--------|-------|
| Total epics | 7 |
| Epics done | 5 |
| Epics in-progress | 1 |
| Total stories | 18 |
| Stories done | 15 |
| Stories in review | 1 |
| Stories backlog | 5 |

---
---

# ════════════════════════════════════════════════════
# SUBPAGE 4: "04 — Health Direction & Ideas"
# ════════════════════════════════════════════════════

# 04 — Health Direction & Ideas

**Source:** `_bmad-output/brainstorming/brainstorming-session-2026-05-15-1955.md`  
**Session Date:** 2026-05-15  
**Techniques:** Inner Child Conference + Future Self Interview  
**Ideas Generated:** 24 across 5 themes

---

## North-Star Sentence (2030)

> *"My best body who knows me so well, and always gives me the right guidance."*

---

## Strategic Context

**Why health?** LifePilot already holds the data no health app can touch — mood history, goal patterns, stress signals, purpose alignment. A standalone health app must ask you about your life. LifePilot already knows it.

**The 80/20 problem:** Health apps address the 20% (physical metrics — steps, calories, sleep) and ignore the 80% (social determinants — relationships, purpose, stress, culture, economic situation). These social factors drive 70-80% of actual health outcomes.

**The structural data moat:** By the time a user adds health features to LifePilot, the platform already has months of context. This is not a feature advantage — it's an architectural one no competitor can replicate.

---

## Session Insights

### Inner Child Conference — Key Breakthroughs

- *"Why does it only ask once a day?"* → overwhelm → the app asks, it doesn't sense → **Silent Watcher** concept
- *"Can't it just tell?"* → the expectation that a caring thing already knows → **Passive health intelligence**
- *"Working = happy, no pain, not hungry, thirsty"* → the WHO definition of health from first principles → **Body Check**, **Needs Layer**
- *"Talking to a machine is weird — it pretends to be a friend"* → honest tool framing → **Familiar Stranger** concept

### Future Self Interview — Key Breakthroughs

- **Tuesday looks like:** Meal recommended → restaurant chosen → shopping list → order placed → gym scheduled → routine ready. Zero friction, guided by the system without effort.
- **What almost killed it:** Too many apps on the market with the same intent. Survived by being structurally different, not feature-different.
- **What competitors missed:** They looked at questionnaire patterns. LifePilot looks at the broader social profile of the person.

---

## 24 Ideas — Organised by Theme

### Theme A — Sensing Without Asking *(Passive Health Intelligence)*

| # | Idea | Core Concept |
|---|------|--------------|
| 1 | **Silent Watcher** | Infer health state from patterns, response timing, skipped check-ins — non-engagement IS data |
| 6 | **Body Check** | One daily body question: pain, hunger, physical comfort — no scores, just acknowledgment |
| 7 | **Needs Layer** | Track basic needs (sleep, water, food, movement) without quantified self data |
| 9 | **Suffering Signal** | Flag when user patterns match early illness or exhaustion — alert without diagnosis |
| 11 | **Daily Renewal** | Treat each day as fresh — no punishing streaks, no guilt accumulation |

### Theme B — Social Health Model *(Life Context as Health Input)*

| # | Idea | Core Concept |
|---|------|--------------|
| 13 | **Social Health Profile** | Map social determinants — relationships, purpose, community, economic stability — as health inputs |
| 14 | **Life Stress Index** | Compute current stress load from goal stress, relationship signals, financial pressure, work intensity |
| 15 | **Context-Aware Recommendations** | Health guidance adjusts based on what kind of week you're having |
| 18 | **Purpose-Health Bridge** | Connect goal progress (or stagnation) to physical wellbeing readouts |
| 21 | **Relationship Health Signal** | Use check-in social data to surface when loneliness or conflict is a health risk |

### Theme C — Zero-Friction Health Stack *(Guided Without Effort)*

| # | Idea | Core Concept |
|---|------|--------------|
| 16 | **Meal Intelligence** | Recommend meals or restaurants based on goals + mood + budget + location |
| 17 | **Shopping List Generator** | Auto-generate ingredient list from meal suggestion with order-online option |
| 19 | **Gym Routine Scheduler** | Book gym time + generate that day's routine with step-by-step instructions |
| 20 | **Nutrition Transparency** | Show calorie and macro values for every meal suggestion without demanding tracking |
| 22 | **Zero-Friction Stack** | Fully guided Tuesday: meal → ingredients → gym → routine → all without decisions |

### Theme D — Honest Tool *(Trust Over Friendship Pretence)*

| # | Idea | Core Concept |
|---|------|--------------|
| 2 | **Familiar Stranger** | Honest, clear guidance — not pretending to be a friend, not cold clinical |
| 3 | **Amnesia Mode** | User can request clean slate — previous patterns not held against them |
| 4 | **No-Streak Mode** | Progress without punishment — missing a day doesn't reset progress visualisation |
| 8 | **Transparent Reasoning** | Show why a recommendation was made — what data drove it |
| 12 | **Honest Uncertainty** | "I don't have enough to say confidently" — respects user intelligence |

### Theme E — Body Self-Awareness *(Know Your Body)*

| # | Idea | Core Concept |
|---|------|--------------|
| 5 | **Energy Diary** | Track subjective energy levels over time vs objective activity — find the gap |
| 10 | **Pain Journal** | Log recurring physical discomforts to surface patterns worth discussing with a doctor |
| 23 | **Body Baseline** | Establish personal health baseline through 30 days of light sensing |
| 24 | **Wearable Bridge** | Phase 2 integration — pull Apple Health / Fitbit data to validate or contrast self-reported signals |

---

## 3 Priorities (Recommended Build Order)

| Priority | Feature | Why First |
|----------|---------|-----------|
| 1 | **Body Check** | Lowest friction health input — one body question per day, no metrics, no wearables. Immediate value, ships in briefing. |
| 2 | **Social Health Model** | The structural differentiator. Map mood, goals, and stress into a social health score that shapes briefing content. No competitor has this. |
| 3 | **Zero-Friction Stack (Meal + Gym)** | The north-star Tuesday. Meal suggestion → shopping list → gym booking → routine. Needs Body Check + Social Health as prerequisites. |

---

## Competitive Context

| Player | Approach | What They Miss |
|--------|----------|----------------|
| Google Health Coach (launched May 2026) | Wearable metrics + AI coaching | Social context — knows your steps, not your week |
| MyFitnessPal | Calorie + macro tracking | Cross-domain — knows food, not your life |
| Calm / Headspace | Meditation streaks | Physical health — knows mood, not body |
| Oura / Whoop | Sleep + HRV biometrics | Social determinants — knows biology, not context |

**The white space:** No consumer product has successfully productized social health for ambitious professionals. The category exists in clinical/public health literature — not in consumer apps.

---
---

# ════════════════════════════════════════════════════
# SUBPAGE 5: "05 — PRFAQ: LifePilot Health"
# ════════════════════════════════════════════════════

# 05 — PRFAQ: LifePilot Health

**Source:** `_bmad-output/planning-artifacts/prfaq-test-bmad.md`  
**Methodology:** Amazon Working Backwards — Press Release First  
**Stage:** 2 — Press Release (in progress)  
**Concept type:** Commercial product — health module extending LifePilot platform

---

## Stage 1 — Concept Validation Notes

**Customer confirmed:** Ambitious busy professional (30–45, married/partnered, career-driven). The builder IS the persona — not a constructed persona.

**Core problem statement:** Health consistently deprioritized despite genuine care. No existing system connects life context (stress, relationships, purpose, culture) to health guidance. Apps address the 20% (physical metrics) and ignore the 80% (social determinants).

**Differentiator:** Structural data moat. LifePilot already holds mood history, goal patterns, stress signals, and purpose alignment that no standalone health app can access. This is architecture, not features.

**Market context:**
- Google Health Coach launched May 19, 2026 — validates the category from the wearable/metrics angle
- SDOH consumer market is wide open — no product has productized social health for professionals
- App fatigue is real: 45% burnout rate; average user juggles 6 health apps
- 70–80% churn within 90 days is the sector's documented failure mode — retention is the hard problem
- Digital health market: $12.87B in 2025, 15.1% CAGR

**Language decision:** "Social health" and "social determinants" carry clinical/low-income associations — avoided in consumer copy. Use instead: *"your life context," "reads your life," "what kind of week you've been having."*

---

## Stage 2 — Press Release Draft (In Progress)

**Status:** Headline ✅ · Subheadline ✅ · Opening ✅ · Problem ✅ · Solution ⬜ · Quote ⬜ · How It Works ⬜ · Customer Quote ⬜ · Getting Started ⬜

---

### Headline ✅ (locked)

**Finally, a Health System That Reads Your Life — Not Just Your Steps**

---

### Subheadline ✅ (locked)

**LifePilot Health gives busy professionals a daily health guide built from everything happening in their life — not just what they tracked at the gym.**

---

### Opening Paragraph ✅ (locked)

**San Francisco, CA — June 2026** — LifePilot today announced LifePilot Health, a daily health guidance layer that draws on a user's goals, mood patterns, stress signals, and life context to deliver personalised health recommendations — automatically, every morning, without being asked. Unlike fitness apps that measure only what users log, LifePilot Health reads the whole picture: a stressful work period, a relationship strain, a streak of missed sleep. For the first time, ambitious professionals get health guidance that actually reflects what's going on in their life.

---

### Problem Paragraph ✅ (locked)

Every morning, you wake up knowing something is off — tired from a packed week, stressed about a deadline, eating whatever's fast because there's no mental space to plan. You have a fitness app. You have a sleep tracker. You have a calorie counter. None of them know you had three late nights because your kid was sick, that your goals feel out of reach, or that you've been skipping check-ins because life got heavy. They keep sending you the same nudge: *close your rings, log your meals, hit your step count*. You're not ignoring your health because you don't care. You're ignoring it because the tools don't understand the life you're actually living.

---

### Next Sections (to be drafted)

- **Solution paragraph** — what changes for the user (benefits, not features)
- **Leader/founder quote** — the vision beyond the feature list
- **How It Works** — the user experience, step by step (from their perspective)
- **Customer quote** — what a real person would say after using this
- **Getting Started** — the clear, concrete path to first value

---

## Customer FAQ (to be drafted)

*(Stage 3 — follows press release completion)*

---

## Internal FAQ (to be drafted)

*(Stage 4 — follows Customer FAQ)*

---

## Verdict (to be drafted)

*(Stage 5 — final assessment of concept strength)*

---
