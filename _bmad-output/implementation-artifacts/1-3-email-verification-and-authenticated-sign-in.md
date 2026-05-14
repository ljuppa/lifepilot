# Story 1.3: Email Verification & Authenticated Sign-In

## Status: review

## Story

As a registered user,
I want to verify my email and sign in to the app,
So that I can access my protected dashboard securely.

## Acceptance Criteria

**AC1:** Given I clicked the verification link in my signup email, when `GET /auth/callback` processes the token, then Supabase Auth exchanges it for a session, a secure `httpOnly` session cookie is set (SameSite=Lax), and I am redirected to `/dashboard`.

**AC2:** Given I click a verification link older than 24 hours, when the callback route processes it, then I see "That link has expired — we've sent you a new one." and a fresh verification email is dispatched automatically.

**AC3:** Given I visit `/sign-in` with a verified account, when I submit correct email and password, then my session cookie is set and I am redirected to `/dashboard`; the password is never logged or exposed in error responses.

**AC4:** Given I submit incorrect credentials, when the server responds, then the error reads "Email or password is incorrect." — no indication of which field is wrong; the password field is cleared; the email field retains my input.

**AC5:** Given the sign-in endpoint receives 5+ failed attempts from the same IP within 15 minutes, when the 6th attempt arrives, then the server returns HTTP 429.

**AC6:** Given I am not signed in, when I navigate to any protected route, then Next.js middleware redirects me to `/sign-in?redirect=[original-path]`; after successful sign-in I am redirected back to my original destination.

**AC7:** Given I am signed in and click "Sign out", when the sign-out action completes, then the session cookie is invalidated server-side, I am redirected to `/sign-in`, and navigating to a protected route redirects me to `/sign-in` again.

**AC8:** Given my session has been inactive for 7 days, when I attempt to access any protected route, then middleware detects the expired session and redirects me to `/sign-in`.

## Tasks / Subtasks

- [ ] Task 1: Auth callback route
  - [ ] 1.1 Create `app/auth/callback/route.ts` — exchange code for session via `supabase.auth.exchangeCodeForSession()`, redirect to `/dashboard` on success
  - [ ] 1.2 Handle expired token: detect error, call `supabase.auth.resend()`, redirect to `/auth/verify-email?resent=true`
  - [ ] 1.3 Write unit tests for callback: valid code → redirect to dashboard, expired code → resend + redirect
- [ ] Task 2: Sign-in API route
  - [ ] 2.1 Create `app/api/auth/sign-in/route.ts` — validate body with `SignInSchema` (email, password), apply same rate limit as sign-up, call `supabase.auth.signInWithPassword()`
  - [ ] 2.2 Map Supabase auth errors to `{ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } }`
  - [ ] 2.3 Add `SignInSchema` to `lib/validation/auth.ts`
  - [ ] 2.4 Write unit tests: correct credentials → 200, wrong credentials → 401 with generic message, rate limit → 429
- [ ] Task 3: Sign-in page UI
  - [ ] 3.1 Create `app/(auth)/sign-in/page.tsx` — form with email and password fields, "Sign in" button with spinner, link to `/sign-up`
  - [ ] 3.2 Wire react-hook-form + zodResolver(SignInSchema)
  - [ ] 3.3 On error: clear password field, retain email, show inline error "Email or password is incorrect."
  - [ ] 3.4 On success: redirect to `redirect` query param or `/dashboard`
  - [ ] 3.5 Write component tests: renders form, clears password on error, retains email on error
- [ ] Task 4: Auth middleware and protected routes
  - [ ] 4.1 Create/update `middleware.ts` — use `@supabase/ssr` to check session; redirect unauthenticated requests to `/sign-in?redirect=[path]` for protected routes (`/dashboard`, `/checkin`, `/goals`, `/profile`, `/settings`, `/data`)
  - [ ] 4.2 Ensure public routes (`/sign-in`, `/sign-up`, `/auth/callback`, `/api/auth/*`, `/api/cookie-consent`) are excluded from auth check
  - [ ] 4.3 Write middleware tests: unauthenticated → redirect, authenticated → pass through
- [ ] Task 5: Sign-out
  - [ ] 5.1 Create `app/api/auth/sign-out/route.ts` (POST) — call `supabase.auth.signOut()`, clear session cookie, return redirect to `/sign-in`
  - [ ] 5.2 Add sign-out button/link to dashboard layout (placeholder nav for demo)
  - [ ] 5.3 Write test: sign-out clears session
- [ ] Task 6: Dashboard placeholder
  - [ ] 6.1 Create `app/(app)/dashboard/page.tsx` — simple "Welcome, you're signed in!" page (full dashboard is Epic 4); serves as the post-auth landing target for the demo

## Dev Notes

- **Architecture ref:** ARCH2 (Zod schemas), ARCH4 (error format), ARCH6 (rate limiting)
- **FRs:** FR1, FR2
- **NFRs:** NFR10 (session expiry 7 days), NFR12 (all routes require auth)
- Supabase SSR handles the httpOnly cookie automatically when using `createServerClient` from `@supabase/ssr`
- The `with-supabase` template already provides `utils/supabase/` helpers — use those, don't create new ones
- Middleware config matcher should exclude `_next/static`, `_next/image`, `favicon.ico`
- For session expiry (NFR10), Supabase JWT default is 1 hour with refresh tokens — configure in Supabase dashboard to 7-day inactivity (this is a config note, not a code task)
- The dashboard page in this story is a placeholder — just needs to show authenticated state for demo

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
