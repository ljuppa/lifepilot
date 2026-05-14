# Story 2.1: Onboarding Wizard — Profile, Goals & Consent

## Status: in-progress

## Story

As a new user who has verified their email,
I want to complete a conversational step-by-step wizard that collects my personal profile, budget basics, life goals, briefing time preference, and data consent,
So that the AI coach has the context it needs to generate my first personalised briefing.

## Acceptance Criteria

**AC1:** Given I have verified my email and sign in for the first time (no profile row exists), when I land on `/dashboard`, then I am redirected to `/onboarding`; a CoachVoiceLine reads "Let's start with the basics — what should I call you?"; a "Step 1 of 3" text indicator is visible; no progress bar.

**AC2:** Given I complete Step 1 (name, age, gender, height, weight, location) and tap "Continue", when all required fields pass Zod validation, then I advance to Step 2 (budget); tapping back returns me to Step 1 with my previous answers preserved.

**AC3:** Given I complete Step 2 (monthly income, fixed expenses, discretionary budget) and tap "Continue", when budget fields pass Zod validation, then I advance to Step 3 (goal selection); DomainChip renders three tappable domain options; I can select 1–3 domains; selecting a domain reveals a goal title input.

**AC4:** Given I have selected at least one domain and entered a goal title and tap "Continue", when goal fields pass Zod validation, then I advance to the briefing time screen; a time picker defaults to 07:00 and a timezone selector defaults to my browser timezone.

**AC5:** Given I confirm my briefing time and tap "Continue", when I reach the consent screen, then plain prose explains data collection; I must check a consent checkbox to proceed.

**AC6:** Given I check the consent checkbox and tap "Start my journey", when the wizard completes, then `profiles` and `goals` rows are inserted; `audit_logs` row written with `event_type: 'consent_given'`; I am redirected to `/dashboard` with coach empty state card.

**AC7:** Given the `profiles` and `goals` Supabase migrations are applied, when any API route reads or writes these tables, then RLS enforces `user_id = auth.uid()` on all operations.

**AC8:** Given a required wizard field is left empty and I attempt to advance, when Zod validation runs, then an inline coach-voice error appears; the step does not advance; errors announced via `aria-live="polite"`.

**AC9:** Given a network error occurs during final wizard submission, when the request fails, then an amber banner reads "Couldn't save your profile — tap to try again."; all wizard answers preserved in form state.

## Tasks / Subtasks

- [x] Task 1: Supabase migrations — profiles and goals tables
- [x] Task 2: Zod validation schemas (ProfileSchema, GoalSchema)
- [x] Task 3: API routes — POST/PATCH /api/profile, POST /api/goals
- [x] Task 4: DomainChip and CoachVoiceLine components
- [x] Task 5: Onboarding wizard page with 5-step flow
- [x] Task 6: Dashboard redirect — check profile existence, redirect to /onboarding if missing
- [x] Task 7: Tests

## Dev Notes

- **FRs:** FR3, FR4, FR5, FR29
- **ARCH:** ARCH2 (Zod in lib/validation/), ARCH3 (migrations), ARCH8 (react-hook-form)
- **UX:** UX-DR7 (DomainChip), UX-DR8 (CoachVoiceLine), UX-DR11 (wizard), UX-DR13 (feedback), UX-DR14 (empty states)
- Wizard state held in React (single page `/onboarding`, steps 1–5 as component state)
- Domain options: health (leaf icon, sage), finance (coins icon, amber), wellness (lotus/heart icon, slate)
- Briefing time stored as `HH:MM` string; timezone as IANA string
- Soft-delete goals: `status: 'inactive'` not hard delete

## Dev Agent Record

### Completion Notes
_To be filled on completion_

## File List
_Updated as files are created/modified_

## Change Log
- 2026-05-14: Story file created, implementation in progress
