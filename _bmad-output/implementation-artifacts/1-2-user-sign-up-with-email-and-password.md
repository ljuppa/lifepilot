# Story 1.2: User Sign-Up with Email & Password

## Status: review

## Story

As a new user,
I want to create an account with my email and password,
So that I have a personal, secure account to begin configuring my life profile.

## Acceptance Criteria

**AC1:** Given I visit `/sign-up`, when I submit a valid email and a password of 8+ characters with the age confirmation checkbox checked, then Supabase Auth creates my user record, a verification email is dispatched, and I see a "Check your inbox" screen displaying the email address I registered with.

**AC2:** Given I submit an email that is already registered, when the server responds, then an inline field error reads "An account with this email already exists — try signing in." No raw Supabase error is exposed.

**AC3:** Given I enter a password shorter than 8 characters, when I move focus away from the password field, then react-hook-form/Zod validation displays "Password must be at least 8 characters" beneath the field before I submit.

**AC4:** Given I have not checked the age confirmation checkbox, when I attempt to submit the form, then the form cannot be submitted and a validation message reads "Please confirm you are 18 or older".

**AC5:** Given the same IP submits more than 5 sign-up requests within 15 minutes, when the 6th request arrives, then the server returns HTTP 429: `{ "error": { "code": "RATE_LIMITED", "message": "Too many sign-up attempts — please wait 15 minutes." } }`.

**AC6:** Given a network error occurs during form submission, when the request fails, then an amber banner reads "Couldn't create your account — tap to try again." and the form retains the user's input.

## Tasks / Subtasks

- [ ] Task 1: Zod schema and validation
  - [ ] 1.1 Create `lib/validation/auth.ts` with `SignUpSchema`: email (valid format), password (min 8 chars), ageConfirmed (literal true with custom message)
  - [ ] 1.2 Write unit tests for SignUpSchema edge cases (short password, missing age confirm, invalid email)
- [ ] Task 2: Sign-up API route
  - [ ] 2.1 Install `@upstash/ratelimit` and `@upstash/redis` (or use in-memory fallback for MVP if Upstash not configured)
  - [ ] 2.2 Create `app/api/auth/sign-up/route.ts` — validate body with SignUpSchema, apply rate limit (5 req / 15 min per IP), call `supabase.auth.signUp()`, return standard `{ data }` / `{ error }` shape
  - [ ] 2.3 Write unit tests for the route: valid signup → 200, duplicate email → 400 with friendly message, short password → 422, rate limit → 429
- [ ] Task 3: Sign-up page UI
  - [ ] 3.1 Create `app/(auth)/sign-up/page.tsx` — form with email, password, age confirmation checkbox, submit button with spinner state
  - [ ] 3.2 Wire react-hook-form + zodResolver(SignUpSchema)
  - [ ] 3.3 Implement "Check your inbox" success screen (same page, conditional render)
  - [ ] 3.4 Implement amber error banner for network errors
  - [ ] 3.5 Write component tests: renders form, shows inline errors, shows success screen, shows amber banner on network error
- [ ] Task 4: Styling and accessibility
  - [ ] 4.1 Apply design tokens to form (use shadcn `Input`, `Button`, `Label` components)
  - [ ] 4.2 Ensure all inputs have explicit `<label htmlFor>` links
  - [ ] 4.3 Ensure error messages are linked via `aria-describedby`

## Dev Notes

- **Architecture ref:** ARCH2 (Zod in lib/validation/), ARCH4 (standard error format), ARCH6 (rate limiting), ARCH8 (react-hook-form + Zod)
- **FRs:** FR1, FR2
- Route group `(auth)` keeps sign-up/sign-in outside the main layout
- Standard error response format: `{ "error": { "code": "RATE_LIMITED", "message": "..." } }`
- For rate limiting: if Upstash Redis is not configured in env, use a simple in-memory Map as fallback (sufficient for demo/testing)
- Supabase `signUp()` returns `data.user` on success; on duplicate email it may return a user without error (Supabase security feature) — handle by checking if email confirmation is pending
- The "Check your inbox" screen should show the email address the user registered with (not a generic message)

## Dev Agent Record

### Implementation Plan
_To be filled during implementation_

### Debug Log
_To be filled if issues arise_

### Completion Notes
_To be filled on completion_

## File List
_Updated as files are created/modified_

## Change Log
_Updated as changes are made_
