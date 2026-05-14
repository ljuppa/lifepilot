# Test Automation Summary

## Generated Tests

### API Tests

- [x] `app/api/__tests__/profile.test.ts` — GET / POST / PATCH `/api/profile` (401, 422, 200, 500 paths) — **13 tests**
- [x] `app/api/__tests__/goals.test.ts` — GET / POST `/api/goals`, DELETE `/api/goals/[id]` (401, 422, 200, 3-goal limit) — **10 tests**

### Unit Tests

- [x] `lib/__tests__/rate-limit.test.ts` — `checkRateLimit`: allows up to limit, blocks excess, resets after window — **6 tests**
- [x] `lib/validation/__tests__/profile.test.ts` — All Zod schemas (Step 1–4, consent, update) — **16 tests** _(pre-existing)_
- [x] `components/ui/__tests__/domain-chip.test.tsx` — `DomainChipSelector` + `DomainChipDisplay` — **10 tests** _(pre-existing)_
- [x] `components/ui/__tests__/coach-voice-line.test.tsx` — `CoachVoiceLine` variants — **4 tests** _(pre-existing)_

### UI / Component Tests

- [x] `app/(app)/__tests__/onboarding.test.tsx` — Full 5-step wizard: validation, navigation, error banners, final API calls — **17 tests**
- [x] `app/(app)/__tests__/profile-page.test.tsx` — Loading skeleton, form pre-population, save flow, unsaved-changes dialog — **7 tests**
- [x] `app/(app)/__tests__/goals-page.test.tsx` — Loading, empty state, list rendering, add/remove flows — **14 tests**

## Coverage

| Area | Tests |
|---|---|
| API routes | 23 |
| UI pages | 38 |
| Unit (rate-limit, validation, components) | 59 |
| **Total** | **120** |

## Bugs Found and Fixed During Test Generation

1. **`AddGoalForm` schema mismatch** — `GoalInputSchema` required `domain` as a form field, but domain was managed by `DomainChipSelector` state (not registered). Replaced with `GoalTitleSchema` (title-only); domain is read from state at submit time.

2. **`ProfileUpdateSchema` empty-string coercion** — `z.coerce.number().optional()` fails on `""` because `ZodOptional` only passes `undefined`, not empty strings. `Number("") = 0` fails `min(18)` for `age`; `""` fails regex for `briefing_time`. Fixed by adding `z.preprocess(toNum, ...)` to all optional numeric fields and `briefing_time`.

## Test Commands

```bash
npm run test          # run all 120 tests
npm run test -- --watch  # watch mode
```
