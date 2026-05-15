# Story 4.2: Today View & Briefing Display

Status: ready-for-dev

## Story

As a signed-in user,
I want to view today's AI-generated briefing in the web app as a card stack,
So that I can read and act on my daily coaching content even if I don't open my email.

## Acceptance Criteria

**AC1 — Dashboard is the Today view:** Given I am signed in and have completed onboarding, when I land on `/dashboard`, then today's briefing card stack is the primary content — not a metrics dashboard; the route is a React Server Component that fetches the briefing server-side (LCP target < 3s).

**AC2 — BriefingCard renders correctly:** Given today's briefing exists, when the briefing renders, then a `BriefingCard` greeting variant appears first (Lora serif, coach voice opening, no domain badge); one `BriefingCard` suggestion variant follows per active goal domain (domain badge colour-coded: health sage / finance amber / wellness slate; Lora prose body 40–80 words; optional inline action link).

**AC3 — AiDisclosureWrapper is non-dismissible:** Given any briefing card stack renders, when the component mounts, then all `BriefingCard` components are wrapped in `AiDisclosureWrapper` rendering a non-dismissible footer `"✦ AI-generated — not medical, nutritional, or financial advice."`; the footer cannot be closed or dismissed.

**AC4 — CoachesObservation card:** Given `briefing.content.observation` is non-null (i.e. the generation pipeline included a weekly observation), when the Today view renders, then a `CoachesObservation` card appears below suggestion cards with: `bg-[#EDE8E0]` surface, `border-l-4 border-[#E8923A]` amber left border, `rounded-r-lg`, "Coach's Observation" label (Inter 11px uppercase tracking-wide amber), Lora italic body, no CTA, no feedback icons; `role="note"`, `aria-label="Coach's Observation"`.

**AC5 — Empty state (no briefing yet):** Given today's briefing does not exist, when the Today view renders, then a skeleton card (`animate-pulse`, `bg-[#EDE8E0]`) is shown for a minimum of 300ms; then a `CoachVoiceLine` empty state appears: `"Your briefing is generating — check back in a few minutes."` or, on the first day ever: `"Your first briefing arrives tomorrow at [configured time]."` (using `profile.briefing_time`).

**AC6 — Responsive layout:** Given the page loads on mobile (< 768px), when the card stack renders, then cards are full-width, single-column, vertically stacked; on tablet/desktop they are centred with a `max-w-[680px]` container.

**AC7 — RLS enforced:** Given the `briefings` table RLS is in place, when the RSC fetches the briefing, then only the authenticated user's briefing for today is returned; unauthenticated users are redirected to `/sign-in`; users without a profile are redirected to `/onboarding`.

**AC8 — loading.tsx skeleton:** Given Next.js streaming is enabled via `loading.tsx`, when the route segment is loading, then a skeleton card stack matching the briefing layout is shown (`animate-pulse`) without a flash of unstyled content.

## Tasks / Subtasks

- [ ] **Task 1 — AiDisclosureWrapper component** (AC: #3)
  - [ ] Create `components/shared/AiDisclosureWrapper.tsx`
  - [ ] Non-dismissible footer: `"✦ AI-generated — not medical, nutritional, or financial advice."`
  - [ ] Muted styling: Inter, `text-xs text-muted-foreground`, `border-t border-border pt-4 mt-6`
  - [ ] Wraps `children` in a `<div>` with the footer appended below
  - [ ] Write co-located test: `components/shared/AiDisclosureWrapper.test.tsx`

- [ ] **Task 2 — BriefingCard component** (AC: #2, #3)
  - [ ] Create `components/briefing/BriefingCard.tsx`
  - [ ] `greeting` variant: Lora serif body, no domain badge, no feedback icons — `role="article"`, `aria-label="Daily greeting"`
  - [ ] `suggestion` variant: `DomainChipDisplay` badge top-left, Lora prose body, optional `action_link_text`/`action_link_url` as inline text link
  - [ ] Card surface: `bg-card rounded-2xl border border-border p-6 space-y-3 shadow-sm`
  - [ ] Lora body class: `font-serif text-base leading-relaxed`
  - [ ] Write co-located test: `components/briefing/BriefingCard.test.tsx`

- [ ] **Task 3 — CoachesObservation component** (AC: #4)
  - [ ] Create `components/briefing/CoachesObservation.tsx`
  - [ ] Surface: `bg-[#EDE8E0] border-l-4 border-[#E8923A] rounded-r-lg p-6`
  - [ ] Label: `text-[11px] font-sans uppercase tracking-widest text-[#E8923A]` — "Coach's Observation"
  - [ ] Body: `font-serif italic text-[15px] leading-relaxed`
  - [ ] Props: `{ body: string }`; `role="note"`, `aria-label="Coach's Observation"`
  - [ ] No CTA, no feedback icons
  - [ ] Write co-located test: `components/briefing/CoachesObservation.test.tsx`

- [ ] **Task 4 — BriefingCardSkeleton component** (AC: #5, #8)
  - [ ] Create `components/briefing/BriefingCardSkeleton.tsx`
  - [ ] `animate-pulse` `bg-[#EDE8E0]` rounded card, matching height of a suggestion card
  - [ ] Used by both `loading.tsx` and the empty-state minimum 300ms display

- [ ] **Task 5 — Update dashboard/page.tsx** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [ ] Keep as React Server Component (no `"use client"`)
  - [ ] Auth pattern: `createClient()` → `auth.getUser()` → redirect `/sign-in` if no user
  - [ ] Profile check: `from("profiles").select("name, briefing_time").eq("id", user.id).single()` → redirect `/onboarding` if no profile
  - [ ] Briefing fetch: `from("briefings").select("*").eq("user_id", user.id).eq("briefing_date", today).maybeSingle()` — today as `new Date().toISOString().split("T")[0]`
  - [ ] Render briefing card stack inside `AiDisclosureWrapper` if briefing exists
  - [ ] Greeting card first, then one `BriefingCard` (suggestion) per `content.suggestions` entry
  - [ ] If `content.observation` is non-null, render `CoachesObservation` after suggestion cards
  - [ ] If no briefing: render `BriefingCardSkeleton` (≥300ms) then `CoachVoiceLine` empty state
  - [ ] Distinguish first-time user (no prior briefings ever) from "generating" state via a second query count
  - [ ] Layout wrapper: `<div className="mx-auto max-w-[680px] px-4 py-10 space-y-4">`

- [ ] **Task 6 — dashboard/loading.tsx** (AC: #8)
  - [ ] Create `app/(app)/dashboard/loading.tsx`
  - [ ] Render 3 × `BriefingCardSkeleton` stacked to match expected card count

- [ ] **Task 7 — Tests** (AC: all)
  - [ ] `app/(app)/__tests__/dashboard-page.test.tsx` — mock `createClient`, test: briefing renders, empty state, first-time state, unauthenticated redirect, skeleton shown

## Dev Notes

### Component File Locations — Critical

Architecture specifies `components/briefing/` and `components/shared/`, but the actual codebase currently has:
- `components/ui/` — shadcn primitives (never manually edit)
- `components/CookieConsentBanner.tsx` — root-level (pre-architecture, do NOT move it)
- No `components/briefing/` or `components/shared/` directories yet

**Create new directories as specified by architecture:**
```
components/shared/AiDisclosureWrapper.tsx
components/shared/AiDisclosureWrapper.test.tsx
components/briefing/BriefingCard.tsx
components/briefing/BriefingCard.test.tsx
components/briefing/CoachesObservation.tsx
components/briefing/CoachesObservation.test.tsx
components/briefing/BriefingCardSkeleton.tsx
```

Tests are **co-located** (beside the component file), not in `__tests__/` subdirectory. Vitest config includes `**/*.{test,spec}.{ts,tsx}` so co-located `.test.tsx` files are auto-discovered.

### Auth Pattern (mandatory — same as all existing routes)

```ts
import { createClient } from "@/utils/supabase/server";

// In RSC:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/sign-in");

const { data: profile } = await supabase
  .from("profiles")
  .select("name, briefing_time")
  .eq("id", user.id)    // NOTE: profiles uses .eq("id", ...) not .eq("user_id", ...)
  .single();
if (!profile) redirect("/onboarding");
```

The existing `dashboard/page.tsx` already uses `.eq("id", user.id)` for profiles — preserve this. Briefings use `.eq("user_id", user.id)`.

### Briefing Fetch Pattern

```ts
const today = new Date().toISOString().split("T")[0];

const { data: briefing } = await supabase
  .from("briefings")
  .select("id, content, briefing_date, email_status, safety_filter_triggered")
  .eq("user_id", user.id)
  .eq("briefing_date", today)
  .maybeSingle();   // maybeSingle() returns null (not error) when no row found
```

### BriefingContent Type

Defined in `lib/inngest/functions/generateBriefing.ts` — import or redeclare inline in the component:

```ts
interface BriefingContent {
  greeting: string;
  suggestions: Array<{
    domain: string;
    title: string;
    body: string;
    action_link_text?: string | null;
    action_link_url?: string | null;
  }>;
  observation?: string | null;
}
```

### DomainChipDisplay — Already Exists

`DomainChipDisplay` is already implemented in `components/ui/domain-chip.tsx`. Import it directly — do NOT recreate it.

```ts
import { DomainChipDisplay } from "@/components/ui/domain-chip";
// Usage: <DomainChipDisplay domain="health" />
// Domain type: "health" | "finance" | "wellness"
```

Domain colour mapping (from existing DomainChipDisplay):
- `health` → sage `border-primary/40 text-primary bg-primary/5`
- `finance` → amber `border-accent/40 text-accent bg-accent/5`
- `wellness` → slate `border-slate-400 text-slate-600 bg-slate-50`

### Font Usage

Lora font is loaded in root `app/layout.tsx` as CSS variable `--font-lora`. Use in Tailwind with `font-serif` class (Tailwind's `font-serif` stack resolves to Georgia etc. as fallback, but the CSS variable `--font-lora` is applied via the `font-lora` variable in `globals.css`).

To use Lora: `className="font-serif"` — this resolves via the `lora.variable = "--font-lora"` applied to `<html>` and the `fontFamily.serif` Tailwind config. Check `tailwind.config.ts` to see if `font-serif` is mapped to `var(--font-lora)` — if not, use `style={{ fontFamily: "var(--font-lora), Georgia, serif" }}`.

### AiDisclosureWrapper Spec

Non-dismissible — no close button, no state. Pure layout wrapper:

```tsx
export function AiDisclosureWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
      <div className="mt-6 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          ✦ AI-generated — not medical, nutritional, or financial advice.
        </p>
      </div>
    </div>
  );
}
```

### CoachesObservation — Content Source

`briefing.content.observation` is generated by the Claude pipeline in Story 4.1. Story 4.2 only **displays** it — no generation logic here. If `observation` is null or undefined, do not render the component at all.

The AC says "at most once per 7 days, never on Monday morning" — this constraint is enforced in `generateBriefing.ts` at write time, not at render time. Dashboard just reads and renders.

### Empty State Logic

Two distinct empty states based on whether the user has **ever** had a briefing:

```ts
// First-time check (user has never received a briefing)
const { count } = await supabase
  .from("briefings")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id);

const isFirstTime = count === 0;
```

- `isFirstTime === true` → `"Your first briefing arrives tomorrow at {profile.briefing_time}."`
- `isFirstTime === false` → `"Your briefing is generating — check back in a few minutes."`

The skeleton (`animate-pulse`) should display for **at least 300ms** before showing the CoachVoiceLine text. Implement with CSS animation delay or a client component that delays the text reveal. Simplest approach: wrap empty state in a `<div className="animate-in fade-in duration-300 delay-300">` client component, or just show the CoachVoiceLine immediately (the skeleton in `loading.tsx` handles the flash protection; once the RSC resolves, either briefing data or empty state text renders without further delay).

### Skeleton Card Spec

```tsx
// BriefingCardSkeleton.tsx
export function BriefingCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-[#EDE8E0] p-6 space-y-3">
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-5/6 rounded bg-muted" />
      <div className="h-4 w-4/6 rounded bg-muted" />
    </div>
  );
}
```

### Testing Patterns

Existing test pattern from `app/(app)/__tests__/profile-page.test.tsx` — mock `@/utils/supabase/server`:

```ts
vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/utils/supabase/server";

function mockSupabase(overrides = {}) {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { name: "Alice", briefing_time: "07:00" }, error: null }) }) }),
    }),
    ...overrides,
  });
}
```

For RSC testing, import the default export directly and call it as an async function:
```ts
import DashboardPage from "@/app/(app)/dashboard/page";
const { container } = render(await DashboardPage());
```

Mock `next/navigation` redirect:
```ts
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
```

### Previous Story Learnings (from 4.1)

- `createClient` import is `from "@/utils/supabase/server"` (not `createServerClient`) — this is established in the codebase
- The Supabase chain builder pattern used in tests: `makeChain(result)` with methods `select`, `eq`, `order`, `single`, `maybeSingle`
- `maybeSingle()` should be added to the chain builder in tests (returns null row rather than error when no row found)
- Component files should NOT use `"use client"` unless they use React hooks or browser APIs — `BriefingCard`, `CoachesObservation`, `AiDisclosureWrapper` are all display-only; keep them as Server Components (no directive) or mark `"use client"` only if needed for hover states

### Files to CREATE (new)

```
components/shared/AiDisclosureWrapper.tsx
components/shared/AiDisclosureWrapper.test.tsx
components/briefing/BriefingCard.tsx
components/briefing/BriefingCard.test.tsx
components/briefing/CoachesObservation.tsx
components/briefing/CoachesObservation.test.tsx
components/briefing/BriefingCardSkeleton.tsx
app/(app)/dashboard/loading.tsx
app/(app)/__tests__/dashboard-page.test.tsx
```

### Files to UPDATE (modify existing)

```
app/(app)/dashboard/page.tsx   — replace placeholder content with briefing card stack RSC
```

### References

- Architecture: `components/briefing/BriefingCard.tsx`, `components/shared/AiDisclosureWrapper.tsx`, `app/(app)/dashboard/page.tsx`
- UX Spec: BriefingCard (p.813), CoachesObservation (p.833), AiDisclosureWrapper (p.436)
- UX-DR4: Email template constraints → same card design reflected in web
- UX-DR5: Dashboard as Today view (not metrics dashboard)
- UX-DR16: AI disclosure mandatory on all LLM surfaces
- Epics: Story 4.2 acceptance criteria (FR9, FR12)
- Story 4.1: BriefingContent type, briefings table schema, PATCH /api/briefing/[id] for future helpfulness (4.3)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
