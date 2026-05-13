# Project Brief — Daily Personal Lifestyle Assistant

## Vision

A hybrid AI-powered daily lifestyle assistant available on **web** and **iOS** that helps users configure their current life state, set meaningful goals across multiple life domains, and receive personalised daily guidance to achieve those goals.

## Target Platforms

- **Web** — responsive browser app (primary)
- **iOS** — native iPhone app (secondary, with deep Apple ecosystem integration)

## Core Life Domains

1. **Health & Fitness** — exercise plans, nutrition tracking, sleep, hydration, weight goals
2. **Finance & Budget** — spending awareness, saving targets, debt reduction, income goals
3. **Mental Wellness** — mood check-ins, mindfulness prompts, habit streaks, stress monitoring
4. **Travel** — location-aware suggestions, trip planning, lifestyle adaptation when abroad

## User Configuration ("Current State")

Users onboard by providing a snapshot of where they are today:

- **Body**: weight, height, age, fitness level, dietary restrictions, health conditions
- **Budget**: monthly income, fixed expenses, savings rate, debt obligations
- **Location**: home city/country, travel status, timezone
- **Lifestyle**: sleep schedule, work hours, stress level, current habits
- **Goals**: short-term (30-day) and long-term (1-year) targets per domain

## AI Engine — Hybrid Approach

- **Structured rules** for routine daily tasks: reminders, streaks, progress calculations, budget alerts
- **LLM (Claude) coaching** for personalised advice, open-ended Q&A, adaptive planning, and motivation
- The assistant learns from check-in data over time to refine recommendations

## Daily Assistant Experience

- Morning briefing: today's focus, agenda, and top 3 actions
- Micro check-ins: quick mood, meal, or activity logs
- Evening review: progress summary, wins, and tomorrow's plan
- On-demand chat: ask the assistant anything about goals or lifestyle

## External Integrations (Phase 1)

- **Apple Health** — sync workouts, steps, sleep, heart rate
- **Fitbit API** — alternative fitness data source
- **Google Calendar / Apple Calendar** — schedule goal-related events, habit reminders

## Out of Scope for v1

- Android native app
- Banking/finance API auto-import (manual budget entry for v1)
- Social/community features
- Wearable app (watchOS)

## Success Metrics

- User completes daily check-in 5+ days/week
- User reports progress on at least one goal within 30 days
- Retention: 40%+ of users active after 60 days

## Assumptions & Constraints

- Solo developer or small team
- Must respect user privacy: health and finance data stored securely, not shared
- LLM API calls should be cost-efficient (cache where possible, avoid unnecessary calls)
- MVP in ~3 months
