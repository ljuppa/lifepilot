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

*(To be populated in step-02-design-epics)*

## Epic List

*(To be populated in step-02-design-epics)*
