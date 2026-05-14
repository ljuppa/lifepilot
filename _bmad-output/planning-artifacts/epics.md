---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# LifePilot - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for LifePilot, decomposing the requirements from the PRD, Architecture, and UX Design Specification into implementable stories.

## Requirements Inventory

### Functional Requirements

**User Account & Profile Management**
- FR1: Users can create an account using email and password
- FR2: Users can verify their email address before accessing the app
- FR3: Users can configure their personal profile (name, age, gender, height, weight, location)
- FR4: Users can set a budget profile (monthly income, fixed expenses, discretionary budget)
- FR5: Users can define 1–3 active life goals across supported domains (health, finance, mental wellness)
- FR6: Users can edit their profile and goals at any time
- FR7: Users can delete their account and all associated data

**Daily Briefing**
- FR8: The system generates a personalised daily briefing for each active user once per day
- FR9: Users can view their daily briefing in the web app
- FR10: Users receive their daily briefing via email at a user-configured time
- FR11: Users can configure the time their daily briefing is delivered
- FR12: The briefing includes at least one actionable suggestion per active goal domain
- FR13: Users can mark a briefing suggestion as helpful or not helpful
- FR14: Users can view their briefing history (last 30 days)

**Manual Check-In**
- FR15: Users can log a daily mood check-in (scale or emotion selection)
- FR16: Users can log a health metric (e.g. weight, steps, water intake) per check-in
- FR17: Users can log a finance metric (e.g. daily spend) per check-in
- FR18: Users can log a wellness metric (e.g. sleep duration, stress level) per check-in
- FR19: The system queues check-in data entered without connectivity and syncs on reconnect

**Goal Progress & Insights**
- FR20: Users can view current progress toward each active goal
- FR21: Users can view a streak count for consecutive daily check-ins
- FR22: The system detects when a user has not checked in for 48+ hours and sends a re-engagement nudge
- FR23: Users can view a weekly summary of check-in data and briefing history

**Notifications & Communication**
- FR24: Users receive a re-engagement email after 48+ hours without a check-in
- FR25: Users can configure which email notification types they receive
- FR26: Users can unsubscribe from all non-critical emails

**Privacy & Data Control**
- FR27: Users can export all personal data in a machine-readable format
- FR28: Users can view a summary of what data is stored about them
- FR29: Users provide explicit consent to data processing during onboarding before any data is collected

**Administration & Operations**
- FR30: Operators can view aggregate platform metrics (DAU, briefing delivery rate, check-in rate) without accessing individual user data
- FR31: Operators can view per-user email delivery status without accessing personal health or financial data
- FR32: Operators can send a system-wide announcement to all users

### NonFunctional Requirements

**Performance**
- NFR1: Web app Largest Contentful Paint < 3 seconds on a 4G mobile connection
- NFR2: All user-interactive API calls respond in < 1 second at p95
- NFR3: Daily briefing email delivered within 5 minutes of user's configured time
- NFR4: Briefing generation pipeline completes in < 60 seconds per user
- NFR5: App is fully usable at screen widths 375px–1440px

**Security**
- NFR6: All data in transit encrypted via TLS 1.3 minimum (Vercel-enforced)
- NFR7: All personal data encrypted at rest in Supabase (AES-256)
- NFR8: Supabase Row Level Security enforced at DB level — users read/write only their own records
- NFR9: All secrets stored in Vercel environment variables — absent from source code and client bundles
- NFR10: Auth tokens expire after 7 days of inactivity; refresh tokens rotated on each use
- NFR11: LLM prompts contain only anonymised, session-scoped context; Anthropic training opt-out enforced
- NFR12: All app routes require a valid authenticated session — no unauthenticated data access
- NFR13: Application hardened against OWASP Top 10: parameterised queries, CSP headers, rate limiting on auth endpoints, structured error logging without PII exposure

**Reliability**
- NFR14: Web app and API availability ≥ 99.5% monthly (Vercel SLA)
- NFR15: Failed briefing jobs retried up to 3 times with exponential backoff (Inngest)
- NFR16: Email delivery failures logged; briefing remains accessible in-app regardless of email status
- NFR17: Infrastructure errors return user-friendly messages — no raw stack traces or DB errors exposed

**Scalability**
- NFR18: Architecture scales from 0 to 1,000 active users with no infrastructure changes
- NFR19: Claude Haiku used for all routine briefings; prompt caching reduces input token cost by ≥ 80%; hard spend alert at $10/month
- NFR20: Supabase free tier supports ~500 users with 90 days of check-in history; one-click upgrade path to Pro

**Accessibility**
- NFR21: All core user flows (onboarding, briefing view, check-in) meet WCAG 2.1 Level AA
- NFR22: All interactive elements keyboard-navigable
- NFR23: Colour contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text (WCAG AA)
- NFR24: All images and icons include descriptive alt text

**DevSecOps & Maintainability**
- NFR25: All changes merged via pull request — no direct commits to main
- NFR26: CI pipeline (lint, type-check, tests, security scan) must pass before merge
- NFR27: Every PR receives an automated Vercel preview deployment for visual review
- NFR28: High/critical Dependabot vulnerabilities resolved within 7 days
- NFR29: Production deployments zero-downtime via Vercel serverless rolling update
- NFR30: Previous production deployment restorable in < 2 minutes via Vercel dashboard

**EU & USA Regulatory Compliance**
- NFR31: GDPR-compliant Privacy Notice displayed before account creation (GDPR Art. 13/14)
- NFR32: Data Processing Agreements executed with all sub-processors before processing EU user data (GDPR Art. 28)
- NFR33: Retention limits automatically enforced: check-ins deleted after 12 months, briefings after 6 months, account data within 30 days of deletion request (GDPR Art. 5(1)(e))
- NFR34: Breach response plan documented; supervisory authority notified within 72h (GDPR Art. 33); FTC and users notified within 60 days
- NFR35: Cookie consent banner shown to EU users before non-essential cookies; consent recorded and auditable (ePrivacy)
- NFR36: All AI-generated content labelled as AI-generated in the UI (EU AI Act 2024)
- NFR37: Age confirmation gate at signup — users confirm they are 18 or older (COPPA safe harbour)
- NFR38: Commercial emails comply with CAN-SPAM: physical address included, unsubscribe honoured within 10 business days, no deceptive subject lines
- NFR39: Payment card data never processed by LifePilot servers — delegated to Stripe (SAQ A PCI DSS)
- NFR40: Privacy rights honoured for residents of Virginia, Colorado, Connecticut, and Texas: opt-out of data sale/sharing, access and correction rights on demand

### Additional Requirements

**From Architecture — Critical (block implementation):**
- ARCH1: Project initialised using `npx create-next-app -e with-supabase lifepilot` then `npx shadcn@latest init` — this is Story 1 of Epic 1
- ARCH2: Zod validation schemas defined in `lib/validation/` — used in both Route Handlers and react-hook-form resolvers; never inline
- ARCH3: Supabase CLI migration workflow — `supabase migration new <name>`, SQL files committed, applied via `supabase db push` in CI
- ARCH4: REST API with standard error format `{ error: { code, message, field } }` and success format `{ data: ... }` — no naked returns
- ARCH5: LLM prompt structure: cached system prompt prefix (role, output format, safety rules, disclosure) + dynamic user block (profile, goals, last 7 days check-ins, today's date); Anthropic prompt caching API; Claude Haiku for MVP briefings

**From Architecture — Important (shape architecture):**
- ARCH6: Upstash rate limiting on auth endpoints — 5 requests per 15 minutes per IP (`@upstash/ratelimit` + Upstash Redis free tier)
- ARCH7: RSC for initial data loads; SWR for polling and revalidation (briefing status, streak); SWR key convention `['/api/{resource}', userId]`
- ARCH8: react-hook-form + Zod resolvers on all forms — client validation mirrors server validation
- ARCH9: AiDisclosureWrapper shared component mandatory on every surface rendering LLM content — non-dismissible footer: "✦ AI-generated — not medical, nutritional, or financial advice."
- ARCH10: Inngest nightly retention job — deletes check-ins older than 12 months, briefings older than 6 months (GDPR Art. 5)
- ARCH11: Audit log table (`audit_logs`) — append-only, indexed on `user_id` and `event_type`; records consent events, data exports, account deletions, admin actions; no PII in log message fields
- ARCH12: Unsubscribe token signing — HMAC-SHA256 with `UNSUBSCRIBE_SECRET` env var; token = `HMAC(userId + email)`, embedded in email templates; unsubscribe endpoint is unauthenticated by design
- ARCH13: Supabase Storage `exports` bucket — private (no public access); only signed URLs (1-hour expiry); RLS policy: SELECT where `user_id = auth.uid()`
- ARCH14: GitHub Actions CI/CD pipeline — lint → type-check → Vitest → npm audit → Snyk → Vercel Preview Deploy per PR → merge to main → Vercel Production Deploy
- ARCH15: Cookie consent (`react-cookie-consent`) geo-targeted to EU users via Vercel Edge headers; consent recorded in audit_logs
- ARCH16: LLM safety filter (`lib/claude/safety.ts`) — server-side pattern filter on all LLM output before storage or delivery; blocks: caloric thresholds below 1200, "stop eating" language, specific investment recommendations, harmful content; single-pass string filter
- ARCH17: Monitoring — Vercel Analytics (web vitals), Inngest dashboard (job observability), structured `console.log` JSON (no PII), Supabase dashboard (DB metrics)
- ARCH18: Data export flow — Inngest job generates JSON → stores in Supabase Storage (signed URL, 1h expiry) → emails download link via Resend

### UX Design Requirements

**Design Tokens & Visual System**
- UX-DR1: Implement CSS custom property design token system in `globals.css` — warm off-white background (#FAF9F6), muted sage primary (#46876A), warm amber accent (#E8923A), coach-observation surface (#EDE8E0), deep charcoal foreground (#2D3142); all WCAG 2.1 AA contrast ratios verified; semantic rules enforced (accent max 2 elements/screen, coach-observation surface on coach messages only, destructive never in coaching flows)
- UX-DR2: Configure dual-font typography system — Inter (variable) for all UI chrome; Lora (variable, serif) for briefing prose, coach's observations, and "Your Journey" chapters; body-lg 18px / 1.7 line-height for briefing content; max line length 65 characters; coach voice copy always body-lg minimum, never bold for emphasis
- UX-DR3: Implement mobile-first responsive layout — 680px max-width for briefing/check-in; 960px for dashboard; 1200px for admin; bottom tab bar (Today / Goals / History / Settings) on mobile (<768px); top nav with horizontal links on desktop (≥1024px); two-column goal grid at md breakpoint

**Email Templates**
- UX-DR4: Build plain HTML email templates with inline CSS matching web token colours — Lora for opening prose, system sans-serif for metadata; consistent subject line format "Your [Day] — [one-line focus preview]"; 180–250 word body maximum; single prominent CTA button; coach sign-off "That's your [Day], [Name]. Make it count."; plain-text alternative on every send; 600px max-width, single column, no images in MVP

**Custom Components — Tier 1 (blocking — core loop)**
- UX-DR5: Build `BriefingCard` custom component — domain badge (health sage / finance amber / wellness slate), Lora serif coach prose body (40–80 words, no bullet lists), optional inline action link, "Was this helpful?" thumb icons on hover/focus; variants: greeting / suggestion / observation; `role="article"`, aria-label; states: default / expanded / dismissed / marked helpful / marked not helpful
- UX-DR6: Build `MoodSelector` custom component — five 44×44px circular touch targets in horizontal row, amber-to-sage colour scale, filled + scale(1.15) selected state; `role="radiogroup"`, `aria-label="How are you feeling today?"`, each dot `role="radio"` labelled "Mood [n] of 5", arrow key navigation
- UX-DR7: Build `DomainChip` custom component — pill shape 32px height, icon (16px) + label (Inter 13px medium); variants by domain: health (leaf, sage), finance (coins, amber), wellness (lotus, slate); modes: selector (`role="checkbox"`, `aria-checked`, space/enter toggle) and display (read-only); states: unselected / selected / disabled
- UX-DR8: Build `CoachVoiceLine` custom component — Lora italic 18px, coach acknowledgement text, variants: opening / closing / empty; one per screen, always first element; never stack two; used at all significant transitions (check-in open, empty states, confirmation closes)

**Custom Components — Tier 2 (coaching relationship & retention)**
- UX-DR9: Build `CoachesObservation` custom component — warm grey surface (#EDE8E0), 4px amber left border, Lora italic 15px body; "Coach's Observation" label (Inter 11px uppercase amber); one open question, no CTA, no feedback icons; `role="note"`, `aria-label="Coach's Observation"`; rendered at most once per week, distinct from briefing cards
- UX-DR10: Build `StreakBadge` custom component — Lucide flame icon (16px amber) + streak count + "day streak" label; amber bg-amber-50 border-amber-200 rounded-full; zero state greyed "Start your streak"; milestone pulse animation (7/30/100 days) respecting `prefers-reduced-motion`; `aria-label="[n] day streak"`

**Onboarding Flow UX**
- UX-DR11: Implement conversational single-question-per-screen onboarding wizard — Step 1: name/age/location; Step 2: budget basics; Step 3: goal domain chip selection (1–3); Step 4: briefing time preference (default 07:00, timezone); Step 5: consent screen (GDPR/CCPA/AI disclaimer, plain prose with key points bulleted); warm coach empty state card (amber border, CoachVoiceLine) on wizard completion — "Your first briefing arrives tomorrow at 07:00"; "Step N of 3" text indicator, no progress bar overload

**Check-In Flow UX**
- UX-DR12: Implement check-in flow as full-screen Sheet on mobile / centred card on desktop — single screen no pagination; CoachVoiceLine opening acknowledging yesterday's suggestion → MoodSelector → domain metric inputs (Slider for continuous, Input[type="number"] for discrete, shown only for active goal domains) → optional 80-char free text (skippable) → "Got it — I'll adjust tomorrow's briefing" closing CoachVoiceLine; 90-second completion target; no streak surface or score on submission; offline queue: check-in data synced on reconnect

**Feedback & Interaction Patterns**
- UX-DR13: Implement coach-voice feedback patterns — check-in submission: CoachVoiceLine (closing variant) full-screen confirmation before nav back, appears in < 500ms; profile save: inline 2s "Saved" field confirmation (silent, no toast); validation error: inline field error with coach-voice message ("That doesn't look like a number — try again?") via aria-describedby; network error: amber top banner with retry CTA ("Couldn't save that — tap to try again."); destructive: Dialog with exact action label ("Delete my account permanently"); no toast notifications; no confetti; no celebration animations beyond StreakBadge milestone pulse

**Empty States & Loading**
- UX-DR14: Implement coach-voice empty states for all screens — Today view: "Your first briefing arrives tomorrow at 07:00. While you wait — how are you feeling today?"; History: "Your briefing history will appear here. Check back after your first week."; Goals: "You haven't set any goals yet. Let's start with one — what do you most want to change this month?"; never blank screen or generic system message
- UX-DR15: Implement skeleton loading screens — shape matches card exactly; `bg-[#EDE8E0]` animated shimmer (animate-pulse); delay skeleton 300ms (no flash for fast loads); `aria-busy="true"` on containers; spinner on primary button during submission, label changes to "[Action]ing…"; check-in confirmation: form disappears and CoachVoiceLine appears < 500ms

**Compliance & Accessibility Components**
- UX-DR16: Build `AiDisclosureWrapper` shared component — non-dismissible footer on all LLM content surfaces, muted styling, coach-voice copy "✦ AI-generated — not medical, nutritional, or financial advice."; mandatory wrapper on BriefingCard and all coach content; EU AI Act compliance; applied as shared component wrapper, never ad-hoc
- UX-DR17: Implement comprehensive accessibility — skip link (first in DOM, visible on focus, `href="#main-content"`); visible focus ring (`--ring` token, 2px offset, never suppressed without replacement); `<label htmlFor>` explicitly linked to every `<input id>`; form errors via `aria-describedby` + `aria-live="polite"`; check-in confirmation via `aria-live="assertive"`; `@media (prefers-reduced-motion)` gates all transitions; colour always paired with icon/text, never alone; email: 16px min font, `role="presentation"` on layout tables, plain-text alternative on every send

**Navigation & Deep Links**
- UX-DR18: Implement email deep link routing — `/today` (Today view pre-scrolled to briefing), `/checkin` (Check-in Sheet opens directly), `/goals` (Goals view); unauthenticated deep links redirect to sign-in then back to intended route; all deep links from email use pre-authenticated magic link (no "log in first" friction)

**Re-Engagement Email**
- UX-DR19: Implement re-engagement email with coach-voice copy — subject "[First name], still here for you"; body: one empathy sentence + specific goal mention + single CTA "Update my goals"; plain-text alternative required; 48h inactivity trigger via Inngest; no further automated contact for 7 days if email unopened; no streak shaming; framed as curiosity not failure ("No pressure — just checking in. Still working toward better sleep?")

**CookieConsentBanner**
- UX-DR20: Implement CookieConsentBanner (`react-cookie-consent`) in root `app/layout.tsx` — geo-targeted to EU users via Vercel Edge headers; session cookies only in MVP; consent recorded in `audit_logs` table with `event_type: 'cookie_consent'`; banner appears before any non-essential cookies are set; consent auditable for GDPR ePrivacy compliance

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 1 | Email/password account creation |
| FR2 | Epic 1 | Email verification before app access |
| FR3 | Epic 2 | Personal profile configuration |
| FR4 | Epic 2 | Budget profile configuration |
| FR5 | Epic 2 | Define 1–3 active life goals |
| FR6 | Epic 2 | Edit profile and goals at any time |
| FR7 | Epic 6 | Delete account and all data |
| FR8 | Epic 4 | Generate personalised daily briefing |
| FR9 | Epic 4 | View briefing in web app |
| FR10 | Epic 4 | Receive briefing via email at configured time |
| FR11 | Epic 4 | Configure briefing delivery time |
| FR12 | Epic 4 | Briefing includes suggestion per active domain |
| FR13 | Epic 4 | Mark briefing suggestion helpful/not helpful |
| FR14 | Epic 4 | View briefing history (30 days) |
| FR15 | Epic 3 | Log daily mood check-in |
| FR16 | Epic 3 | Log health metric per check-in |
| FR17 | Epic 3 | Log finance metric per check-in |
| FR18 | Epic 3 | Log wellness metric per check-in |
| FR19 | Epic 3 | Offline check-in queue + sync |
| FR20 | Epic 5 | View progress toward each active goal |
| FR21 | Epic 5 | View consecutive check-in streak |
| FR22 | Epic 5 | Detect 48h inactivity and send nudge |
| FR23 | Epic 5 | View weekly summary of check-ins and briefings |
| FR24 | Epic 5 | Re-engagement email after 48h without check-in |
| FR25 | Epic 5 | Configure email notification preferences |
| FR26 | Epic 5 | Unsubscribe from non-critical emails |
| FR27 | Epic 6 | Export all personal data |
| FR28 | Epic 6 | View data summary |
| FR29 | Epic 2 | Explicit consent during onboarding |
| FR30 | Epic 7 | Operator aggregate platform metrics |
| FR31 | Epic 7 | Operator per-user email delivery status |
| FR32 | Epic 7 | Operator system-wide broadcast |

## Epic List

### Epic 1: Foundation & Authenticated Access
Users can create an account, verify their email, and sign in securely to a deployed web app. This epic produces the working Next.js scaffold, database schema, CI/CD pipeline, design token system, and auth flow that all subsequent epics depend on.

**FRs covered:** FR1, FR2
**ARCH covered:** ARCH1, ARCH2, ARCH3, ARCH4, ARCH6, ARCH14
**UX covered:** UX-DR1, UX-DR2, UX-DR3, UX-DR17, UX-DR20

### Epic 2: Life Profile & Goal Configuration
Users can complete a conversational onboarding wizard — entering their personal profile, budget basics, and 1–3 life goals across health, finance, and wellness — and edit any of this at any time. Users provide explicit data consent during onboarding.

**FRs covered:** FR3, FR4, FR5, FR6, FR29
**ARCH covered:** ARCH8
**UX covered:** UX-DR7, UX-DR8, UX-DR11, UX-DR13, UX-DR14, UX-DR15

### Epic 3: Daily Check-In
Users can log a daily check-in — mood, one health metric, one finance metric, one wellness metric — in under 90 seconds, with offline support that syncs on reconnect.

**FRs covered:** FR15, FR16, FR17, FR18, FR19
**UX covered:** UX-DR6, UX-DR12

### Epic 4: Daily Briefing Engine
Users receive a personalised AI-generated daily briefing via email at their configured time, can view it in the web app, mark suggestions as helpful/not helpful, and browse their 30-day briefing history. The AI pipeline uses Claude Haiku with prompt caching, a safety filter, and mandatory AI disclosure.

**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14
**ARCH covered:** ARCH5, ARCH9, ARCH16, ARCH17
**UX covered:** UX-DR4, UX-DR5, UX-DR9, UX-DR16

### Epic 5: Goal Progress, Insights & Re-engagement
Users can track progress toward each active goal, see their check-in streak, view a weekly summary, and receive a gentle coach-voice nudge after 48h inactivity. Users control which notification types they receive and can unsubscribe from non-critical emails.

**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR25, FR26
**ARCH covered:** ARCH12
**UX covered:** UX-DR10, UX-DR18, UX-DR19

### Epic 6: Privacy, Data Control & Compliance
Users can export all their data, view a data summary, and delete their account with all associated data. The platform automatically enforces GDPR retention limits and maintains an append-only audit log.

**FRs covered:** FR7, FR27, FR28
**ARCH covered:** ARCH10, ARCH11, ARCH13, ARCH15, ARCH18

### Epic 7: Administration & Operations
Operators can view aggregate platform health metrics, look up per-user email delivery status, and send system-wide announcements — without accessing any personal health or financial data.

**FRs covered:** FR30, FR31, FR32

---

## Epic 1: Foundation & Authenticated Access

Users can create an account, verify their email, and sign in securely to a deployed web app. The working Next.js scaffold, CI/CD pipeline, design token system, and auth flow are in place for all subsequent epics to build on.

### Story 1.1: Project Scaffold & Deployment Foundation

As a developer,
I want the project initialized, CI/CD configured, and a hello-world app deployed to Vercel with design tokens and accessibility baseline in place,
So that all subsequent feature stories have a stable, testable, deployable foundation to build on.

**Acceptance Criteria:**

**Given** the project does not yet exist
**When** `npx create-next-app -e with-supabase lifepilot` and `npx shadcn@latest init` are run
**Then** the project builds without errors (`next build` exits 0) and `tsc --noEmit`, `eslint .`, and `vitest run` all pass

**Given** the project is created
**When** `globals.css` is updated with design tokens
**Then** CSS custom properties include `--background: 40 30% 98%`, `--foreground: 220 15% 20%`, `--primary: 152 35% 42%`, `--accent: 35 80% 58%`, `--coach-observation: 40 25% 92%`, `--radius: 0.75rem`; Inter and Lora are loaded via `next/font` and applied per the typography spec

**Given** the repo is on GitHub
**When** a PR is opened to `main`
**Then** `.github/workflows/ci.yml` runs: lint → type-check → `vitest run` → `npm audit --audit-level=high` → Snyk scan; all steps must pass before merge is unblocked; Vercel creates a preview deployment and posts its URL to the PR

**Given** any page loads
**When** a keyboard user tabs into the page
**Then** a skip link `<a href="#main-content">Skip to content</a>` is the first focusable element in the DOM and becomes visible on focus

**Given** a user visits from an EU country (detected via `x-vercel-ip-country` header)
**When** the root layout renders
**Then** `CookieConsentBanner` (react-cookie-consent) is displayed before any non-essential cookies are set; on acceptance, an `audit_logs` row is inserted with `event_type: 'cookie_consent'` and `user_id: null`; the `audit_logs` migration creates the table as append-only, indexed on `(user_id, event_type)`

**Given** `.env.example` is committed
**When** a developer clones the repo
**Then** all required environment variable keys are present with placeholder values; `.env.local` is listed in `.gitignore`; no real secrets appear in any committed file

### Story 1.2: User Sign-Up with Email & Password

As a new user,
I want to create an account with my email and password,
So that I have a personal, secure account to begin configuring my life profile.

**Acceptance Criteria:**

**Given** I visit `/sign-up`
**When** I submit a valid email and a password of 8+ characters with the age confirmation checkbox checked
**Then** Supabase Auth creates my user record, a verification email is dispatched, and I see a "Check your inbox" screen displaying the email address I registered with

**Given** I submit an email that is already registered
**When** the server responds
**Then** an inline field error reads "An account with this email already exists — try signing in." No raw Supabase error is exposed

**Given** I enter a password shorter than 8 characters
**When** I move focus away from the password field
**Then** react-hook-form/Zod validation displays "Password must be at least 8 characters" beneath the field before I submit

**Given** I have not checked the age confirmation checkbox
**When** I attempt to submit the form
**Then** the form cannot be submitted and a validation message reads "Please confirm you are 18 or older"

**Given** the same IP submits more than 5 sign-up requests within 15 minutes
**When** the 6th request arrives
**Then** the server returns HTTP 429: `{ "error": { "code": "RATE_LIMITED", "message": "Too many sign-up attempts — please wait 15 minutes." } }`

**Given** a network error occurs during form submission
**When** the request fails
**Then** an amber banner reads "Couldn't create your account — tap to try again." and the form retains the user's input

### Story 1.3: Email Verification & Authenticated Sign-In

As a registered user,
I want to verify my email and sign in to the app,
So that I can access my protected dashboard securely.

**Acceptance Criteria:**

**Given** I clicked the verification link in my signup email
**When** `GET /auth/callback` processes the token
**Then** Supabase Auth exchanges it for a session, a secure `httpOnly` session cookie is set (SameSite=Lax), and I am redirected to `/dashboard`

**Given** I click a verification link older than 24 hours
**When** the callback route processes it
**Then** I see "That link has expired — we've sent you a new one." and a fresh verification email is dispatched automatically

**Given** I visit `/sign-in` with a verified account
**When** I submit correct email and password
**Then** my session cookie is set and I am redirected to `/dashboard`; the password is never logged or exposed in error responses

**Given** I submit incorrect credentials
**When** the server responds
**Then** the error reads "Email or password is incorrect." — no indication of which field is wrong; the password field is cleared; the email field retains my input

**Given** the sign-in endpoint receives 5+ failed attempts from the same IP within 15 minutes
**When** the 6th attempt arrives
**Then** the server returns HTTP 429: `{ "error": { "code": "RATE_LIMITED", "message": "Too many sign-in attempts — please wait 15 minutes." } }`

**Given** I am not signed in
**When** I navigate to any protected route (`/dashboard`, `/checkin`, `/goals`, `/profile`, `/settings`, `/data`)
**Then** Next.js middleware redirects me to `/sign-in?redirect=[original-path]`; after successful sign-in I am redirected back to my original destination

**Given** I am signed in and click "Sign out"
**When** the sign-out action completes
**Then** the session cookie is invalidated server-side, I am redirected to `/sign-in`, and navigating to a protected route redirects me to `/sign-in` again

**Given** my session has been inactive for 7 days
**When** I attempt to access any protected route
**Then** middleware detects the expired session and redirects me to `/sign-in`

---

## Epic 2: Life Profile & Goal Configuration

Users can complete a conversational onboarding wizard — personal profile, budget, goals, briefing time, and GDPR consent — and edit any of this at any time after onboarding.

### Story 2.1: Onboarding Wizard — Profile, Goals & Consent

As a new user who has verified their email,
I want to complete a conversational step-by-step wizard that collects my personal profile, budget basics, life goals, briefing time preference, and data consent,
So that the AI coach has the context it needs to generate my first personalised briefing.

**Acceptance Criteria:**

**Given** I have verified my email and sign in for the first time (no profile row exists)
**When** I land on `/dashboard`
**Then** I am redirected to `/onboarding/step-1`; a CoachVoiceLine reads "Let's start with the basics — what should I call you?"; a "Step 1 of 3" text indicator is visible top-right; no progress bar

**Given** I complete Step 1 (name, age, gender, height, weight, location) and tap "Continue"
**When** all required fields pass Zod validation
**Then** I advance to Step 2 (budget: monthly income, fixed expenses, discretionary budget); the "Step 2 of 3" indicator updates; tapping back returns me to Step 1 with my previous answers preserved

**Given** I complete Step 2 and tap "Continue"
**When** budget fields pass Zod validation
**Then** I advance to Step 3 (goal selection); "Step 3 of 3" is shown; the `DomainChip` component renders three tappable domain options (Health / Finance / Wellness); I can select 1–3 domains; selecting a domain reveals a goal title input for that domain

**Given** I have selected at least one domain and entered a goal title and tap "Continue"
**When** goal fields pass Zod validation
**Then** I advance to the briefing time screen (no step counter); a time picker defaults to 07:00 and a timezone selector defaults to my browser timezone

**Given** I confirm my briefing time and tap "Continue"
**When** I reach the consent screen
**Then** plain prose explains what data is collected, the legal basis (GDPR Art. 6(1)(b)), the sub-processor list, and retention periods; "View Privacy Policy" links to the full policy; I must check a consent checkbox to proceed; I cannot advance without checking it

**Given** I check the consent checkbox and tap "Start my journey"
**When** the wizard completes
**Then** a `profiles` row and one `goals` row per selected domain are inserted via `POST /api/profile` and `POST /api/goals`; an `audit_logs` row is written with `event_type: 'consent_given'`; I am redirected to `/dashboard`; the Today view shows a warm coach card (amber left border, CoachVoiceLine): "Your first briefing arrives tomorrow at [configured time]. While you wait — how are you feeling today?"

**Given** the `profiles` and `goals` Supabase migrations are applied
**When** any API route reads or writes these tables
**Then** RLS policies enforce `user_id = auth.uid()` on all SELECT, INSERT, and UPDATE operations; no user can read another user's profile or goals

**Given** a required wizard field is left empty and I attempt to advance
**When** Zod validation runs on the server
**Then** the field shows an inline coach-voice error (e.g. "That doesn't look right — try again?"); the step does not advance; the error is announced via `aria-live="polite"`

**Given** a network error occurs during final wizard submission
**When** the `POST /api/profile` or `POST /api/goals` request fails
**Then** an amber banner reads "Couldn't save your profile — tap to try again."; all wizard answers are preserved in form state

### Story 2.2: Profile & Goal Editing

As a signed-in user who has completed onboarding,
I want to edit my personal profile, budget details, and active goals at any time,
So that my AI coach always reflects my current situation and priorities.

**Acceptance Criteria:**

**Given** I navigate to `/profile`
**When** the page loads
**Then** a skeleton card (`animate-pulse`, `bg-[#EDE8E0]`) is shown while data fetches; once loaded, all current profile values are pre-populated in the edit form

**Given** I change one or more profile fields and tap "Save"
**When** `PATCH /api/profile` succeeds
**Then** the field border briefly turns sage green and the label reads "Saved" for 2 seconds; no page reload; no toast notification

**Given** I have made unsaved profile changes and attempt to navigate away
**When** the navigation event fires
**Then** a Dialog appears: "You have unsaved changes. Leave?" with "Stay" (primary) and "Leave anyway" (secondary ghost) buttons

**Given** I navigate to `/goals`
**When** the page loads
**Then** my current active goals are listed with domain chip labels, goal titles, and Edit / Remove actions; if no goals exist, a CoachVoiceLine reads "You haven't set any goals yet. Let's start with one — what do you most want to change this month?"

**Given** I tap "Add goal" and fewer than 3 active goals exist
**When** the add goal form appears
**Then** it shows a `DomainChip` selector and a goal title input; on save, `POST /api/goals` creates the goal and the list refreshes inline

**Given** I already have 3 active goals
**When** I view the goals page
**Then** the "Add goal" button is disabled and a label reads "You've reached the maximum of 3 active goals"

**Given** I tap "Remove" on a goal and confirm in the Dialog
**When** `DELETE /api/goals/[id]` succeeds
**Then** the goal is marked `status: 'inactive'` (soft-delete) and disappears from the list; the "Add goal" button re-enables

**Given** I tap "Edit" on a goal
**When** the inline edit form saves
**Then** `PATCH /api/goals/[id]` updates the record and the form closes with a 2-second "Saved" confirmation

**Given** any `/api/profile` or `/api/goals` route handler is called
**When** the handler runs
**Then** `createServerClient()` is called first, `supabase.auth.getUser()` is verified, and all DB queries use `user.id` — never a client-supplied `userId`; unauthenticated calls return HTTP 401: `{ "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" } }`
