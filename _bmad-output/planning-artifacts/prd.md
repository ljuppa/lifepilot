---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
workflowStatus: complete
completedAt: '2026-05-14'
releaseMode: phased
inputDocuments: [docs/project-brief.md]
workflowType: prd
classification:
  projectType: consumer-web-ios-app
  domain: consumer-wellness-personal-productivity
  complexity: medium-high
  projectContext: greenfield
---

# Product Requirements Document — LifePilot

**Author:** Ljuppa  
**Date:** 2026-05-14  
**Status:** In Progress — PRD Complete, Architecture Defined

---

## Executive Summary

LifePilot is a proactive, cross-domain AI life agent for web (MVP) and iOS (Phase 2) that eliminates the fragmentation of modern self-improvement tools. Users configure a full life profile — body metrics, budget, location, relationship status, and goals — and the agent acts on that unified picture daily without being prompted. Target users are goal-oriented adults (25–45) managing multiple life dimensions simultaneously but lacking the bandwidth to coordinate across siloed apps.

The core problem is not lack of tracking tools — it's lack of agency. LifePilot replaces passive dashboards with an active agent: it sends morning briefings, generates personalised recipes, suggests budget-matched trips, proposes fitness routines, surfaces social suggestions in context, and dispatches reminders and emails — automatically, every day.

**What makes it special:** Every competitor (MyFitnessPal, YNAB, Calm, dating apps, travel planners) operates in a single domain and waits for the user to act. LifePilot's differentiator is **cross-domain proactivity** — it treats a user's life as a unified system and generates actions that optimise across all goals simultaneously. A user wanting to lose weight, save money, and meet new people might receive one suggestion — a free outdoor group fitness event — that advances all three goals at once.

| Attribute | Value |
|---|---|
| Project Type | Consumer Web App (MVP) → Native iOS App (Phase 2) |
| Domain | Consumer Wellness & Personal Productivity |
| Complexity | Medium-High — multi-domain AI, phased platform expansion, EU/US compliance |
| Project Context | Greenfield |
| AI Engine | Hybrid — rule-based for routine tasks, Claude LLM for coaching and cross-domain reasoning |
| Builder | Solo (engineering manager + BMAD agentic AI team) |
| MVP Cost Target | < $5/month (0–50 users) |

---

## Success Criteria

### User Success

- **Daily engagement:** 60%+ of active users complete a daily check-in 5+ days/week within their first 30 days
- **Goal progress:** 70%+ of users demonstrate measurable progress on at least one goal within 30 days of onboarding
- **Aha! moment:** First cross-domain recommendation received within 24 hours of completing profile setup
- **Retention:** 40%+ of users remain active (≥ 1 session/week) at 60 days post-signup
- **Agent trust:** 50%+ of users act on an agent-generated suggestion within their first week

### Business Success

- **3-month:** 1,000 active users; daily briefing email open rate ≥ 45%
- **12-month:** 25,000 active users; freemium monetisation model validated
- **Monetisation:** Freemium — core features free; premium tier ($9.99/month) unlocks advanced integrations and unlimited LLM coaching
- **Virality:** 20%+ of new signups from referral by month 6

### Technical Success

- Briefing generated and delivered within 60 seconds of scheduled time
- LLM cost per active user per day ≤ $0.05 (prompt caching + Haiku model)
- API and web app availability ≥ 99.5% monthly
- Zero user health or financial data shared with third parties

### Measurable Outcomes

| Metric | 30-Day Target | 90-Day Target |
|---|---|---|
| Daily check-in rate | 50% | 60% |
| Cross-domain suggestions acted on | 40% | 55% |
| 7-day retention | 55% | 65% |
| 60-day retention | 35% | 45% |
| Daily briefing email open rate | 40% | 50% |

---

## Product Scope

### Phase 1 — MVP (~3 months, web only)

Prove the daily briefing loop before building the recommendation engine. One AI-generated briefing per day, delivered in-app and by email, based on manually entered profile and goals.

**In scope:**
- Web app (responsive, Next.js)
- User account, profile setup (body basics, budget, 1–3 goals across health / finance / wellness)
- Daily AI briefing — LLM-generated, emailed at user-configured time
- Manual check-in: mood, one health metric, one finance metric, one wellness metric
- Goal progress display and daily check-in streak
- Re-engagement nudge email after 48h inactivity
- User data export and account deletion (GDPR/CCPA)

**Explicitly deferred to Phase 2:**
- Native iOS app
- Apple Health / Fitbit integration
- Cross-domain recommendation fusion engine
- Calendar integration, travel and dating domains
- Push notifications (email replaces in MVP)
- Admin dashboard, subscription/payments

**MVP infrastructure (cost-optimised):**

| Layer | Service | Monthly cost |
|---|---|---|
| Frontend + API | Next.js on Vercel (free tier) | $0 |
| Database + Auth | Supabase (free tier) | $0 |
| Email | Resend (free — 3,000/month) | $0 |
| Background jobs | Inngest (free — 50k steps/month) | $0 |
| LLM | Claude Haiku API (0–50 users) | ~$1–3 |
| Domain | Namecheap / Cloudflare | ~$1 |
| **Total** | | **~$2–5/month** |

### Phase 2 — Growth (months 4–8, post-validation)

- Native iOS app (Swift / SwiftUI, iOS 16+)
- Apple Health integration (HealthKit: steps, sleep, workouts, heart rate)
- Fitbit API integration
- Google / Apple Calendar integration
- Travel and dating/social domains
- Cross-domain recommendation fusion engine
- Evening review: progress summary and tomorrow's plan
- Re-engagement nudge flow and inactivity detection
- Freemium subscription (Stripe for web, StoreKit 2 for iOS)

### Phase 3 — Vision (post-revenue)

- Full agentic actions: books restaurants, reserves classes, purchases travel on behalf of user
- Voice interface (Siri / in-app)
- Apple Watch app
- Adaptive learning engine (suggestions refined from long-term behaviour)
- Social features: shared goals, accountability partners
- Multi-language support

---

## User Journeys

### Journey 1 — Marco, 32, the Overwhelmed Achiever *(Primary — Happy Path)*

Marco is a product manager in Amsterdam. He works out sporadically, overspends on takeaway, and hasn't taken a holiday in 18 months. His goals — lose 8kg, save €5,000, travel to Japan — live in three separate apps he barely opens.

He discovers LifePilot, spends 12 minutes on onboarding, and the next morning receives his first briefing: a 20-minute bodyweight routine before his stand-up, a meal-prep idea under his food budget, and a note that Tokyo flights are down 18% this month. One app. Three goals. Instant clarity. By week 3 he's lost 2kg, saved €400, and has a trip booked for October.

**Capabilities revealed:** onboarding wizard, daily briefing engine, cross-domain recommendation logic, email delivery, goal progress display.

### Journey 2 — Aisha, 28, the Goal Drifter *(Primary — Edge Case)*

Aisha signs up motivated but goes quiet after day 4. The agent detects 48 hours of inactivity and sends a low-pressure nudge: *"No pressure — just checking in. Still want to work toward better sleep?"* She responds, updates her goal (dating is now the priority), and the agent recalibrates to surface weekend social suggestions alongside her fitness plan.

**Capabilities revealed:** inactivity detection, re-engagement nudge, goal editing mid-journey, dynamic agent recalibration, social/dating domain integration.

### Journey 3 — Platform Operator *(Admin / Ops)*

A platform operator monitors the admin dashboard: LLM cost per user per day, briefing delivery success rate, email bounce rates. They flag a user for support and push a system-wide announcement about a new feature.

**Capabilities revealed:** aggregate metrics dashboard, email delivery monitoring, user flag/lookup, broadcast messaging.

### Journey 4 — Support Agent *(Secondary)*

A user reports their briefing emails aren't arriving. The support agent checks email delivery status for that user, sees bounced emails due to a typo in the address, and sends a templated fix guide. No access to the user's health or financial data.

**Capabilities revealed:** per-user email delivery status, privacy-scoped support view, templated resolution guides.

### Journey Requirements Summary

| Capability Area | Revealed By |
|---|---|
| Onboarding profile wizard | Marco, Aisha |
| Daily briefing generation & email delivery | Marco, Aisha |
| Cross-domain recommendation engine | Marco |
| Inactivity detection & re-engagement | Aisha |
| Goal editing & agent recalibration | Aisha |
| Social/dating domain (Phase 2) | Aisha |
| Aggregate metrics & broadcast messaging | Platform Operator |
| Privacy-scoped email delivery support | Support Agent |

---

## Domain-Specific Requirements

### Privacy & Data Handling

- **GDPR / CCPA / multi-state US:** Users can export or delete all personal data on demand; data processing consent captured at onboarding with explicit legal basis per data type; privacy policy required before account creation
- **Data minimisation:** Only data actively used by the agent is collected; no speculative data collection
- **AI disclaimer:** All LLM-generated suggestions labelled as AI-generated and include a disclaimer — not medical, nutritional, financial, or legal advice
- **Sub-processor control:** No health or financial data shared with LLM provider beyond anonymised, session-scoped prompts; Anthropic training data opt-out enforced

### Technical Constraints

- Health and financial data encrypted at rest (AES-256) and in transit (TLS 1.3)
- LLM responses pass through a rule-based safety filter before delivery — blocks extreme dietary advice, unsafe financial guidance, and harmful content
- Financial suggestions are directional guidance only; no regulated financial advice language

### Integration Requirements (Phase 2)

- OAuth 2.0 for all third-party integrations (HealthKit, Fitbit, Google/Apple Calendar)
- OAuth tokens stored in iOS Keychain (device) and server-side encrypted vault — never in plaintext
- Token refresh failures degrade gracefully: agent continues with available data and notifies user to re-authorise
- Dating app integrations: launch with deep-link approach; direct API access negotiated post-MVP

---

## Innovation & Novel Patterns

### Core Innovations

**1. Cross-Domain Proactive Agency**
No existing consumer product models a user's life as a unified system and generates cross-domain actions automatically. Every competitor is single-domain and reactive. LifePilot's loop — profile → unified life model → proactive multi-domain action — is genuinely novel.

**2. Life-State as a First-Class Data Model**
A structured "current life state" snapshot (body + budget + location + relationship status + goals) as a continuously updated, queryable profile that an AI agent reasons over. Most apps track activity; LifePilot models the whole person.

**3. Cross-Domain Recommendation Fusion**
A scoring engine that ranks recommendations by aggregate goal advancement across domains, producing a single suggestion that simultaneously advances health, finance, and social goals.

### Competitive Landscape

| Competitor | Domain | What They Miss |
|---|---|---|
| MyFitnessPal | Health/nutrition | Single domain, reactive |
| YNAB | Finance | Single domain, no lifestyle context |
| Calm / Headspace | Mental wellness | Single domain, no cross-domain intelligence |
| Google Assistant / Siri | General AI | No persistent goal model, not proactive |

No direct competitor operates across all domains with a proactive, unified-model agent.

### Validation Approach

- **Week 1:** Do users act on cross-domain suggestions more than single-domain ones? (A/B testable)
- **Month 1:** Do users with 3+ active domains retain better? (cohort analysis)
- **Core hypothesis:** Users receiving cross-domain suggestions have 2× the 30-day retention vs single-domain-only users

### Innovation Risks

| Risk | Mitigation |
|---|---|
| Cross-domain engine produces irrelevant suggestions | User feedback loop ("Was this helpful?") feeds relevance score; fall back to single-domain if confidence is low |
| LLM hallucinations in advice | Rule-based safety filter on all output; factual claims sourced from APIs not LLM |
| Dating API restrictions | Deep-link approach at launch; negotiate direct API post-MVP |

---

## Platform Requirements

### MVP — Web App

| Layer | Technology | Notes |
|---|---|---|
| Frontend + API | Next.js 15 (App Router) + TypeScript | Serverless functions on Vercel |
| Styling | Tailwind CSS + shadcn/ui | Accessible component library |
| Database + Auth | Supabase (PostgreSQL + RLS) | Free tier for MVP |
| Background jobs | Inngest | Scheduled briefing generation, retries |
| Email | Resend | Transactional email, React Email templates |
| LLM | Claude Haiku (routine) / Sonnet (complex) | Prompt caching on system prompts |

**Browser support:** Chrome 110+, Safari 16+, Firefox 110+  
**Responsive range:** 375px (iPhone SE) to 1440px (desktop)  
**Offline:** No offline LLM support in MVP; check-in data queued locally and synced on reconnect

### Phase 2 — Native iOS App

| Attribute | Value |
|---|---|
| Language | Swift / SwiftUI |
| Minimum OS | iOS 16+ |
| HealthKit | Read: steps, sleep, workouts, heart rate (required for health domain) |
| Push Notifications | Daily briefing, re-engagement nudges, goal milestones |
| Calendar | Read/write goal-linked events (optional, Growth feature) |
| Location | When-in-use, for location-aware suggestions (optional) |

**App Store compliance (Phase 2):**
- HealthKit entitlement — purpose strings per data type in `Info.plist`
- Privacy nutrition label: Health & Fitness + Financial Info declared accurately
- In-app purchases via StoreKit 2
- No data collection beyond declared uses (App Review guideline 5.1.1)

### DevSecOps Pipeline

All phases share the same pipeline:

```
AI Agent → GitHub PR → CI (lint, type-check, Vitest, npm audit, Snyk)
→ Vercel Preview Deploy → Human review → Merge to main → Production deploy (zero-downtime)
```

**Security controls:** branch protection on `main`, GitHub secret scanning, Dependabot weekly dependency PRs, Supabase RLS, all secrets in Vercel environment variables, TLS 1.3 enforced by Vercel.

---

## Functional Requirements

### User Account & Profile Management

- **FR1:** Users can create an account using email and password
- **FR2:** Users can verify their email address before accessing the app
- **FR3:** Users can configure their personal profile (name, age, gender, height, weight, location)
- **FR4:** Users can set a budget profile (monthly income, fixed expenses, discretionary budget)
- **FR5:** Users can define 1–3 active life goals across supported domains (health, finance, mental wellness)
- **FR6:** Users can edit their profile and goals at any time
- **FR7:** Users can delete their account and all associated data

### Daily Briefing

- **FR8:** The system generates a personalised daily briefing for each active user once per day
- **FR9:** Users can view their daily briefing in the web app
- **FR10:** Users receive their daily briefing via email at a user-configured time
- **FR11:** Users can configure the time their daily briefing is delivered
- **FR12:** The briefing includes at least one actionable suggestion per active goal domain
- **FR13:** Users can mark a briefing suggestion as helpful or not helpful
- **FR14:** Users can view their briefing history (last 30 days)

### Manual Check-In

- **FR15:** Users can log a daily mood check-in (scale or emotion selection)
- **FR16:** Users can log a health metric (e.g. weight, steps, water intake) per check-in
- **FR17:** Users can log a finance metric (e.g. daily spend) per check-in
- **FR18:** Users can log a wellness metric (e.g. sleep duration, stress level) per check-in
- **FR19:** The system queues check-in data entered without connectivity and syncs on reconnect

### Goal Progress & Insights

- **FR20:** Users can view current progress toward each active goal
- **FR21:** Users can view a streak count for consecutive daily check-ins
- **FR22:** The system detects when a user has not checked in for 48+ hours and sends a re-engagement nudge
- **FR23:** Users can view a weekly summary of check-in data and briefing history

### Notifications & Communication

- **FR24:** Users receive a re-engagement email after 48+ hours without a check-in
- **FR25:** Users can configure which email notification types they receive
- **FR26:** Users can unsubscribe from all non-critical emails

### Privacy & Data Control

- **FR27:** Users can export all personal data in a machine-readable format
- **FR28:** Users can view a summary of what data is stored about them
- **FR29:** Users provide explicit consent to data processing during onboarding before any data is collected

### Administration & Operations

- **FR30:** Operators can view aggregate platform metrics (DAU, briefing delivery rate, check-in rate) without accessing individual user data
- **FR31:** Operators can view per-user email delivery status without accessing personal health or financial data
- **FR32:** Operators can send a system-wide announcement to all users

---

## Non-Functional Requirements

### Performance

- **NFR1:** Web app Largest Contentful Paint < 3 seconds on a 4G mobile connection
- **NFR2:** All user-interactive API calls (profile updates, check-ins, goal edits) respond in < 1 second at p95
- **NFR3:** Daily briefing email delivered within 5 minutes of user's configured time
- **NFR4:** Briefing generation pipeline (LLM call + DB write + email dispatch) completes in < 60 seconds per user
- **NFR5:** App is fully usable at screen widths 375px–1440px

### Security

- **NFR6:** All data in transit encrypted via TLS 1.3 minimum (Vercel-enforced)
- **NFR7:** All personal data encrypted at rest in Supabase (AES-256)
- **NFR8:** Supabase Row Level Security enforced at DB level — users read/write only their own records
- **NFR9:** All secrets stored in Vercel environment variables — absent from source code and client bundles
- **NFR10:** Auth tokens expire after 7 days of inactivity; refresh tokens rotated on each use
- **NFR11:** LLM prompts contain only anonymised, session-scoped context — no raw personal data; Anthropic training opt-out enforced
- **NFR12:** All app routes require a valid authenticated session — no unauthenticated data access
- **NFR13:** Application hardened against OWASP Top 10: parameterised queries, CSP headers, rate limiting on auth endpoints, structured error logging without PII exposure

### Reliability

- **NFR14:** Web app and API availability ≥ 99.5% monthly (Vercel SLA)
- **NFR15:** Failed briefing jobs retried up to 3 times with exponential backoff (Inngest)
- **NFR16:** Email delivery failures logged; briefing remains accessible in-app regardless of email status
- **NFR17:** Infrastructure errors return user-friendly messages — no raw stack traces or DB errors exposed

### Scalability

- **NFR18:** Architecture scales from 0 to 1,000 active users with no infrastructure changes (Vercel serverless auto-scaling)
- **NFR19:** Claude Haiku used for all routine briefings; prompt caching reduces input token cost by ≥ 80%; hard spend alert set at $10/month
- **NFR20:** Supabase free tier (500MB) supports ~500 users with 90 days of check-in history; one-click upgrade path to Pro when needed

### Accessibility

- **NFR21:** All core user flows (onboarding, briefing view, check-in) meet WCAG 2.1 Level AA
- **NFR22:** All interactive elements keyboard-navigable
- **NFR23:** Colour contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text (WCAG AA)
- **NFR24:** All images and icons include descriptive alt text

### DevSecOps & Maintainability

- **NFR25:** All changes merged via pull request — no direct commits to `main`
- **NFR26:** CI pipeline (lint, type-check, tests, security scan) must pass before merge
- **NFR27:** Every PR receives an automated Vercel preview deployment for visual review
- **NFR28:** High/critical Dependabot vulnerabilities resolved within 7 days of detection
- **NFR29:** Production deployments zero-downtime via Vercel serverless rolling update
- **NFR30:** Previous production deployment restorable in < 2 minutes via Vercel dashboard

### EU & USA Regulatory Compliance

- **NFR31:** GDPR-compliant Privacy Notice displayed before account creation — states data purpose, legal basis per data type, retention periods, sub-processor list, and right to lodge a supervisory authority complaint (GDPR Art. 13/14)
- **NFR32:** Data Processing Agreements executed with all sub-processors (Supabase, Anthropic, Resend, Vercel, Inngest) before processing EU user data (GDPR Art. 28)
- **NFR33:** Retention limits automatically enforced: check-in data deleted after 12 months, briefing history after 6 months, account data within 30 days of deletion request (GDPR Art. 5(1)(e))
- **NFR34:** Breach response plan documented; supervisory authority notified within 72h (GDPR Art. 33); FTC and affected users notified within 60 days (FTC Health Breach Notification Rule)
- **NFR35:** Cookie consent banner shown to EU users before non-essential cookies are set; consent recorded and auditable (ePrivacy Directive)
- **NFR36:** All AI-generated content labelled as AI-generated in the UI (EU AI Act 2024 — transparency obligation)
- **NFR37:** Age confirmation gate at signup — users confirm they are 18 or older (COPPA safe harbour)
- **NFR38:** Commercial emails comply with CAN-SPAM: physical mailing address included, unsubscribe honoured within 10 business days, no deceptive subject lines
- **NFR39:** Payment card data never processed by LifePilot servers — delegated entirely to Stripe (SAQ A PCI DSS compliance)
- **NFR40:** Privacy rights honoured for residents of Virginia (CDPA), Colorado (CPA), Connecticut (CTDPA), and Texas (TDPSA): opt-out of data sale/sharing, access and correction rights on demand
