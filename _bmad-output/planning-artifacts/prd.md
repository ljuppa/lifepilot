---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys]
inputDocuments: [docs/project-brief.md]
workflowType: prd
classification:
  projectType: consumer-web-ios-app
  domain: consumer-wellness-personal-productivity
  complexity: medium-high
  projectContext: greenfield
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
---

# Product Requirements Document - Daily Personal Lifestyle Assistant

**Author:** Ljuppa
**Date:** 2026-05-14

## Executive Summary

LifePilot is a proactive, cross-domain AI life agent for web and iOS that eliminates the fragmentation of modern self-improvement tools. Users configure their full life profile — body metrics, budget, location, relationship status, and goals — and the agent acts on that unified picture daily without being prompted. Target users are goal-oriented adults (25–45) who are actively trying to improve multiple life dimensions simultaneously but lack the time or mental bandwidth to coordinate across siloed apps.

The core problem is not lack of information or tracking tools — it's lack of agency. Users know they want to eat better, travel more, save money, and improve their social life, but no tool connects these domains or acts on their behalf. LifePilot replaces passive dashboards with an active agent: it sends morning briefings, generates personalised recipes, suggests budget-matched trips, proposes fitness routines, surfaces dating app matches in context, and dispatches reminders and emails — all automatically, all day, every day.

### What Makes This Special

Every competing product (MyFitnessPal, YNAB, Calm, dating apps, travel planners) operates in a single domain and waits for the user to take action. LifePilot's differentiator is **cross-domain proactivity**: it treats a user's life as a unified system and generates actions that optimise across all domains simultaneously. A user who wants to lose weight, save money, and meet new people might receive a suggestion for a free outdoor group fitness event this weekend — one recommendation that advances three goals at once. The core insight is that life goals are not independent, and the first product to model them together and act on them proactively wins.

## Project Classification

| Attribute | Value |
|---|---|
| Project Type | Consumer Web App + Native iOS App |
| Domain | Consumer Wellness & Personal Productivity |
| Complexity | Medium-High (multi-domain AI, 3 external API integrations, dual platform) |
| Project Context | Greenfield |
| AI Engine | Hybrid — structured rules for routine tasks, LLM (Claude) for coaching and cross-domain reasoning |

## Success Criteria

### User Success

- **Daily engagement:** 60%+ of active users complete a daily check-in (mood, activity, or meal log) 5+ days per week within their first 30 days
- **Goal progress:** 70%+ of users report or demonstrate measurable progress on at least one configured goal within 30 days of onboarding
- **Aha! moment:** User receives their first cross-domain recommendation (e.g. a budget-friendly outdoor workout that advances both health and finance goals) within 24 hours of completing profile setup
- **Retention:** 40%+ of users remain active (minimum 1 session per week) at 60 days post-signup
- **Agent trust:** 50%+ of users act on (open, save, or complete) an agent-generated suggestion within their first week

### Business Success

- **3-month target:** 1,000 active users; App Store rating ≥ 4.2; average daily briefing open rate ≥ 45%
- **12-month target:** 25,000 active users; sustainable monetisation model validated (freemium or subscription)
- **Monetisation:** Freemium model — core agent features free, premium tier ($9.99/month) unlocks advanced integrations, unlimited LLM coaching, and automated email dispatch
- **Virality indicator:** 20%+ of new signups from referral or word-of-mouth by month 6

### Technical Success

- **Agent response time:** Daily briefing generated and delivered within 60 seconds of scheduled time
- **LLM cost efficiency:** Average LLM cost per active user per day ≤ $0.05 through prompt caching and rule-based pre-filtering
- **Integration reliability:** Apple Health and Calendar sync success rate ≥ 99%; Fitbit sync ≥ 97%
- **Uptime:** API and web app availability ≥ 99.5% monthly
- **Data privacy:** Zero user health or financial data shared with third parties; all sensitive data encrypted at rest and in transit

### Measurable Outcomes

| Metric | Baseline | 30-Day Target | 90-Day Target |
|---|---|---|---|
| Daily check-in rate | 0% | 50% | 60% |
| Cross-domain suggestions acted on | 0% | 40% | 55% |
| 7-day retention | 0% | 55% | 65% |
| 60-day retention | 0% | 35% | 45% |
| Avg. daily briefing open rate | 0% | 40% | 50% |

## Product Scope

### MVP — Minimum Viable Product

Core agent loop that proves the cross-domain value proposition:

- User profile setup: body metrics, budget snapshot, location, active goals (health + finance + wellness)
- Daily morning briefing: top 3 personalised actions across configured domains
- LLM-powered suggestions: recipes, workout plans, budget tips, mindfulness prompts
- Manual data entry: meals, workouts, mood, spending
- Apple Health integration: read steps, workouts, sleep, heart rate
- Push notifications and in-app reminders
- Web app (responsive) + iOS native app
- Basic goal progress tracking and streaks

### Growth Features (Post-MVP)

Features that make LifePilot competitive and sticky:

- Travel domain: budget-matched trip suggestions, location-aware itineraries
- Fitbit API integration: alternative fitness data source
- Google Calendar / Apple Calendar integration: schedule goal-linked events
- Dating app integration: surface social/relationship suggestions in context
- Automated email dispatch: agent sends daily briefing or reminders via email
- Evening review: progress summary and tomorrow's plan
- Premium subscription tier unlock

### Vision (Future)

The full agentic dream — the agent acts, not just advises:

- Full agentic actions: books restaurants, reserves classes, purchases travel on behalf of user
- Voice interface: talk to the agent via Siri or in-app voice
- Apple Watch app: glanceable daily briefing and quick check-ins
- Social features: shared goals, accountability partners
- Adaptive learning: agent refines suggestions based on long-term behaviour patterns
- Multi-language support

## User Journeys

### Journey 1 — Marco, 32, the Overwhelmed Achiever *(Primary User — Happy Path)*

Marco is a product manager in Amsterdam. He works out sporadically, overspends on takeaway, and hasn't taken a holiday in 18 months. He has goals — lose 8kg, save €5,000, travel to Japan — but they live in three separate apps that he barely opens.

He discovers LifePilot, spends 12 minutes on onboarding (body stats, budget snapshot, goals, location), and connects Apple Health. The next morning he gets his first briefing: a 20-minute bodyweight routine he can do before his stand-up, a meal prep idea for the week that keeps him under his food budget, and a notification that flights to Tokyo are down 18% this month. One app. Three goals. Instant clarity. He acts on all three. By week 3 he's lost 2kg, saved €400, and has a Tokyo trip planned for October.

**Capabilities revealed:** onboarding profile wizard, Apple Health read, daily briefing engine, cross-domain recommendation logic, push notifications.

---

### Journey 2 — Aisha, 28, the Goal Drifter *(Primary User — Edge Case)*

Aisha signs up motivated but goes quiet after day 4. The agent detects no check-ins for 48 hours and sends a low-pressure nudge: *"No pressure — just checking in. Still want to work toward better sleep?"* She responds, updates her goal (sleep is actually less important than dating right now), and reconnects her profile. The agent recalibrates and starts surfacing weekend social event suggestions alongside her fitness plan.

**Capabilities revealed:** inactivity detection, re-engagement nudge flow, goal editing mid-journey, dynamic agent recalibration, dating/social domain integration.

---

### Journey 3 — Platform Operator *(Admin / Ops User)*

A platform operator monitors the LifePilot admin dashboard: LLM cost per user per day, daily briefing delivery success rate, integration sync errors (Apple Health auth expiry, Fitbit token refresh failures). They can flag users for support, view aggregate engagement metrics, and push system-wide announcements.

**Capabilities revealed:** admin dashboard, observability/logging, integration health monitoring, user management, broadcast messaging.

---

### Journey 4 — Support Agent *(Secondary User)*

A user reports their Apple Health data isn't syncing. The support agent looks up the user's integration status, sees a revoked HealthKit permission, and sends a templated guide to re-authorise. No access to personal health data — only integration metadata and connection status.

**Capabilities revealed:** support tooling, integration status visibility, privacy-scoped data access, templated resolution guides.

---

### Journey Requirements Summary

| Capability Area | Revealed By |
|---|---|
| Onboarding profile wizard | Marco, Aisha |
| Cross-domain recommendation engine | Marco |
| Daily briefing generation & delivery | Marco, Aisha |
| Apple Health / Fitbit integration | Marco, Support Agent |
| Inactivity detection & re-engagement | Aisha |
| Goal editing & agent recalibration | Aisha |
| Dating/social domain | Aisha |
| Admin dashboard & observability | Platform Operator |
| Privacy-scoped support tooling | Support Agent |
| Push notifications & email dispatch | Marco, Aisha |
