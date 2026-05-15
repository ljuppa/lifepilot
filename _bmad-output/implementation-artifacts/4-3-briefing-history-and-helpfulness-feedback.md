# Story 4.3: Briefing History & Helpfulness Feedback

Status: done

## Story

As a signed-in user,
I want to browse my last 30 days of briefings and mark suggestions as helpful or not helpful,
So that I can review my coaching history and signal to the AI what is working for me.

## Acceptance Criteria

**AC1 — History list view:** Given I navigate to `/briefing`, when the page loads, then my last 30 briefings are listed ordered by date descending; each row shows: date, first 100 characters of opening prose, email delivery status badge; skeleton loading shown during fetch; `GET /api/briefing` filters server-side to `briefing_date >= (today − 30 days)`.

**AC2 — Empty state:** Given no briefings exist yet, when the history page loads, then a `CoachVoiceLine` reads "Your briefing history will appear here. Check back after your first briefing."

**AC3 — Detail view navigation:** Given I tap a briefing entry, when I navigate to `/briefing/[id]`, then the full briefing card stack renders using the same `BriefingCard` and `AiDisclosureWrapper` components as the Today view; `GET /api/briefing/[id]` returns the single briefing for the authenticated user.

**AC4 — Helpfulness feedback UI:** Given I am viewing a `BriefingCard` suggestion variant with `onFeedback` provided, when I hover or focus the card, then two ghost icon buttons appear: "Mark as helpful" (thumb up) and "Mark as not helpful" (thumb down); each has `aria-label`; minimum 44×44px touch target.

**AC5 — Feedback submission:** Given I tap a helpfulness button, when `PATCH /api/briefing/[id]` succeeds with `{ helpful: true | false }`, then the selected icon fills with the domain colour; the other icon dims; the rating persists on page reload.

**AC6 — Persisted feedback display:** Given a briefing was previously rated, when I open it again, then the previously selected icon is pre-filled from the `briefings` table `helpful` column.

**AC7 — API security:** Given any `/api/briefing` route handler runs, when the handler executes, then session is verified first; all queries use `user.id`; unauthenticated requests return HTTP 401.

## Tasks / Subtasks

- [x] **Task 1 — Extract shared briefing content utilities** (AC: none — prep)
  - [x] Create `lib/briefing/content.ts` exporting: `VALID_DOMAINS`, `BriefingContent` interface, `BriefingSuggestion` interface, `isValidContent()` type guard, `isSafeUrl()` sanitizer
  - [x] Update `app/(app)/dashboard/page.tsx` to import from `@/lib/briefing/content` (remove the inline duplicates)
  - [x] Run full test suite — all 223 must still pass

- [x] **Task 2 — Update BriefingCard with feedback UI** (AC: #4, #5, #6)
  - [x] Add `"use client"` directive to `components/briefing/BriefingCard.tsx`
  - [x] Add optional props to `BriefingCardSuggestionProps`: `helpful?: boolean | null`, `onFeedback?: (value: boolean) => void`
  - [x] Add `group relative` to the `<article>` className (alongside existing classes)
  - [x] When `onFeedback` is provided, render feedback div: `absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity`
  - [x] ThumbsUp button: `aria-label="Mark as helpful"`, `aria-pressed={helpful === true}`, Lucide `ThumbsUp` icon
  - [x] ThumbsDown button: `aria-label="Mark as not helpful"`, `aria-pressed={helpful === false}`, Lucide `ThumbsDown` icon
  - [x] Selected icon fill: `text-primary` (health), `text-accent` (finance), `text-slate-500` (wellness) — unselected: `text-muted-foreground/50`
  - [x] Buttons call `onFeedback(true)` / `onFeedback(false)` on click
  - [x] Min touch target: `p-2` padding on buttons (creates ≥ 44px hit area with 24px icon)
  - [x] Update `components/briefing/BriefingCard.test.tsx` — add feedback tests

- [x] **Task 3 — BriefingDetailContent client component** (AC: #4, #5, #6)
  - [x] Create `components/briefing/BriefingDetailContent.tsx` with `"use client"`
  - [x] Props: `{ briefing: { id: string; content: unknown; helpful: boolean | null; briefing_date: string } }`
  - [x] State: `const [helpful, setHelpful] = useState<boolean | null>(briefing.helpful ?? null)`
  - [x] `handleFeedback`: optimistic `setHelpful(value)`, then `fetch("PATCH /api/briefing/${briefing.id}", { body: JSON.stringify({ helpful: value }) })` — no revert on error (non-critical)
  - [x] Renders: greeting BriefingCard + suggestion BriefingCards with `helpful={helpful}` and `onFeedback={handleFeedback}` + optional CoachesObservation + AiDisclosureWrapper wrapper
  - [x] Imports `isValidContent`, `VALID_DOMAINS`, `isSafeUrl` from `@/lib/briefing/content`
  - [x] Create co-located test: `components/briefing/BriefingDetailContent.test.tsx`

- [x] **Task 4 — Briefing history list page** (AC: #1, #2, #7)
  - [x] Create `app/(app)/briefing/page.tsx` — RSC
  - [x] Auth guard: same pattern as dashboard (redirect `/sign-in`, redirect `/onboarding`)
  - [x] Direct Supabase query: `from("briefings").select("id, briefing_date, content, email_status").eq("user_id", user.id).gte("briefing_date", cutoff).order("briefing_date", { ascending: false })`
  - [x] `cutoff`: `new Date(); setDate(-30); toISOString().split("T")[0]`
  - [x] Each row as `<Link href="/briefing/${b.id}">` rendering date, preview text (first 100 chars of `content.greeting` via `isValidContent`), `EmailStatusBadge`
  - [x] `EmailStatusBadge`: inline component — `delivered` → green, `pending` → amber, `failed` → red
  - [x] Date formatting: `const [y,m,d] = date.split("-").map(Number); new Date(y,m-1,d).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })`
  - [x] Empty state: `<CoachVoiceLine variant="empty">Your briefing history will appear here. Check back after your first briefing.</CoachVoiceLine>`
  - [x] Layout: `<div className="mx-auto max-w-[680px] px-4 py-10 space-y-2">`
  - [x] Create `app/(app)/briefing/loading.tsx` — 3 skeleton rows (`animate-pulse h-16 rounded-xl bg-coach-observation`)
  - [x] Create `app/(app)/briefing/__tests__/history-page.test.tsx`

- [x] **Task 5 — Briefing detail page** (AC: #3, #7)
  - [x] Create `app/(app)/briefing/[id]/page.tsx` — RSC
  - [x] Auth guard (same pattern)
  - [x] `const { id } = await params;`
  - [x] Supabase: `.select("id, content, helpful, briefing_date, email_status").eq("id", id).eq("user_id", user.id).single()`
  - [x] If error or no data: `redirect("/briefing")`
  - [x] Render: `<BriefingDetailContent briefing={briefing} />` inside the standard layout wrapper
  - [x] Create `app/(app)/briefing/[id]/loading.tsx` — 3 × `BriefingCardSkeleton`
  - [x] Create `app/(app)/briefing/[id]/__tests__/detail-page.test.tsx`

### Review Findings (AI) — 2026-05-15

- [x] [Review][Patch] isSafeUrl allows protocol-relative `//evil.com` URLs — open redirect [lib/briefing/content.ts] — **Fixed:** added `if (lower.startsWith("//")) return false`
- [x] [Review][Patch] Touch targets 34px < 44px AC4 minimum [components/briefing/BriefingCard.tsx] — **Fixed:** added `min-w-[44px] min-h-[44px] flex items-center justify-center` to button className
- [x] [Review][Patch] formatDate produces "Invalid Date" for malformed briefing_date [app/(app)/briefing/page.tsx] — **Fixed:** added regex guard `if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr ?? ""`
- [x] [Review][Patch] Double-tap race: two concurrent PATCHes when feedback buttons clicked rapidly [components/briefing/BriefingDetailContent.tsx] — **Fixed:** added `pendingRef` (useRef) guard; second click during in-flight PATCH is ignored
- [x] [Review][Patch] External action links missing `target="_blank"` [components/briefing/BriefingCard.tsx] — **Fixed:** added `target="_blank"` to action link `<a>` element
- [x] [Review][Patch] isValidContent allows `suggestions: [null]` causing runtime crash in render loop [lib/briefing/content.ts] — **Fixed:** added `.every(s => s !== null && typeof s === "object")` check
- [x] [Review][Defer] `http://` allowed by isSafeUrl — design question; low risk in this context — deferred, pre-existing
- [x] [Review][Defer] greeting.slice(0,100) may cut mid-Unicode surrogate at byte 100 — cosmetic, low probability — deferred
- [x] [Review][Defer] `text-slate-500` for wellness domain not a design token — design question — deferred
- [x] [Review][Defer] 30-day cutoff uses server timezone — acceptable for daily briefing granularity — deferred

## Dev Notes

### CRITICAL: API Routes Already Implemented — Do NOT Recreate

Both API endpoints were built in Story 4.1 and are fully operational:

- **`GET /api/briefing`** (`app/api/briefing/route.ts`) — lists last 30 days, ordered desc
- **`GET /api/briefing/[id]`** (`app/api/briefing/[id]/route.ts`) — single briefing by id
- **`PATCH /api/briefing/[id]`** (`app/api/briefing/[id]/route.ts`) — updates `helpful` column

The `helpful` column (`boolean | null`) already exists in the `briefings` table. No DB migrations needed. Do NOT touch these files.

### CRITICAL: BriefingCard is the Right Target — Not a New Component

The feedback buttons live inside `BriefingCard` (suggestion variant), not in a wrapper. The card needs `"use client"` because:
1. `onClick` event handlers on DOM elements require client hydration
2. CSS group hover (`group-hover:*`) works without JS but the class must be present at render

The greeting card and CoachesObservation card do NOT show feedback icons — feedback is only on suggestion variants AND only when `onFeedback` is provided.

### BriefingCard Changes — Exact Spec

Current props (do not remove any):
```ts
interface BriefingCardSuggestionProps {
  variant: "suggestion";
  domain: Domain;
  body: string;
  actionLinkText?: string | null;
  actionLinkUrl?: string | null;
}
```

Add to suggestion variant:
```ts
  helpful?: boolean | null;      // current selection state (controlled by parent)
  onFeedback?: (value: boolean) => void;  // if absent, no feedback UI shown
```

Article element — add `group relative` (keep existing classes):
```tsx
<article
  role="article"
  aria-label={ariaLabel}
  className="group relative bg-card rounded-2xl border border-border p-6 space-y-3 shadow-sm"
>
```

Feedback section (render only when `onFeedback` is provided, suggestion variant only):
```tsx
{onFeedback && (
  <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
    <button
      type="button"
      onClick={() => onFeedback(true)}
      aria-label="Mark as helpful"
      aria-pressed={helpful === true}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
    >
      <ThumbsUp
        size={18}
        className={helpful === true ? DOMAIN_FILL[domain] : "text-muted-foreground/50"}
      />
    </button>
    <button
      type="button"
      onClick={() => onFeedback(false)}
      aria-label="Mark as not helpful"
      aria-pressed={helpful === false}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
    >
      <ThumbsDown
        size={18}
        className={helpful === false ? DOMAIN_FILL[domain] : "text-muted-foreground/50"}
      />
    </button>
  </div>
)}
```

Domain fill class map (define at module level):
```ts
import { ThumbsUp, ThumbsDown } from "lucide-react";

const DOMAIN_FILL: Record<Domain, string> = {
  health: "text-primary",
  finance: "text-accent",
  wellness: "text-slate-500",
};
```

### BriefingDetailContent — Shared Helpful State

The `helpful` value is per-briefing, not per-suggestion card. One PATCH updates the whole briefing. The parent manages state and passes it down to all suggestion cards so they stay in sync:

```tsx
"use client";
import { useState } from "react";
import { BriefingCard } from "./BriefingCard";
import { CoachesObservation } from "./CoachesObservation";
import { AiDisclosureWrapper } from "@/components/shared/AiDisclosureWrapper";
import { isValidContent, VALID_DOMAINS, isSafeUrl } from "@/lib/briefing/content";
import type { Domain } from "@/components/ui/domain-chip";

interface BriefingRow {
  id: string;
  content: unknown;
  helpful: boolean | null;
  briefing_date: string;
}

export function BriefingDetailContent({ briefing }: { briefing: BriefingRow }) {
  const [helpful, setHelpful] = useState<boolean | null>(briefing.helpful ?? null);

  async function handleFeedback(value: boolean) {
    setHelpful(value);  // optimistic — no revert
    await fetch(`/api/briefing/${briefing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpful: value }),
    });
  }

  const content = isValidContent(briefing.content) ? briefing.content : null;
  if (!content) return null;

  return (
    <AiDisclosureWrapper>
      <div className="space-y-4">
        <BriefingCard variant="greeting" body={content.greeting} />
        {content.suggestions.map((s, i) => {
          const domain = VALID_DOMAINS.has(s.domain) ? (s.domain as Domain) : "wellness";
          const safeUrl = isSafeUrl(s.action_link_url) ? s.action_link_url : null;
          return (
            <BriefingCard
              key={`${s.domain}-${i}`}
              variant="suggestion"
              domain={domain}
              body={s.body}
              actionLinkText={s.action_link_text}
              actionLinkUrl={safeUrl}
              helpful={helpful}
              onFeedback={handleFeedback}
            />
          );
        })}
        {content.observation && <CoachesObservation body={content.observation} />}
      </div>
    </AiDisclosureWrapper>
  );
}
```

### lib/briefing/content.ts — Exact Spec

This extracts the inline utilities from `dashboard/page.tsx`. After creating this file, update dashboard to import from here:

```ts
// lib/briefing/content.ts
export const VALID_DOMAINS = new Set<string>(["health", "finance", "wellness"]);

export interface BriefingSuggestion {
  domain: string;
  title: string;
  body: string;
  action_link_text?: string | null;
  action_link_url?: string | null;
}

export interface BriefingContent {
  greeting: string;
  suggestions: BriefingSuggestion[];
  observation?: string | null;
}

export function isValidContent(value: unknown): value is BriefingContent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.greeting === "string" && Array.isArray(v.suggestions);
}

export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().trimStart();
  return lower.startsWith("/") || lower.startsWith("https://") || lower.startsWith("http://");
}
```

Updated import in `dashboard/page.tsx`:
```ts
import { VALID_DOMAINS, isValidContent, isSafeUrl } from "@/lib/briefing/content";
import type { BriefingContent } from "@/lib/briefing/content";
// Remove the inline definitions that duplicated this
```

### Auth Pattern — Same as Dashboard

All pages use this exact sequence (briefing table queries use `.eq("user_id", user.id)`, profiles use `.eq("id", user.id)`):

```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/sign-in");

const { data: profile } = await supabase
  .from("profiles")
  .select("name, briefing_time")
  .eq("id", user.id)
  .single();

if (!profile) redirect("/onboarding");
```

### Date Formatting — Avoid UTC Midnight Trap

`new Date("2026-05-15")` parses as UTC midnight → May 14 in timezones behind UTC. Safe approach:

```ts
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}
// "2026-05-15" → "May 15, 2026"
```

### EmailStatusBadge — Inline in History Page

No separate file — define inline in `briefing/page.tsx`:

```tsx
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  delivered: { label: "Delivered", cls: "text-green-700 bg-green-50 border border-green-200" },
  pending:   { label: "Pending",   cls: "text-amber-700 bg-amber-50 border border-amber-200" },
  failed:    { label: "Failed",    cls: "text-red-700 bg-red-50 border border-red-200" },
};

function EmailStatusBadge({ status }: { status: string }) {
  const { label, cls } = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
```

### History List Item — Exact Layout

```tsx
<Link
  href={`/briefing/${b.id}`}
  className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:bg-muted/40 transition-colors"
>
  <div className="space-y-0.5 min-w-0">
    <p className="text-sm font-medium text-foreground">{formatDate(b.briefing_date)}</p>
    <p className="text-sm text-muted-foreground truncate">
      {isValidContent(b.content) ? b.content.greeting.slice(0, 100) : "—"}
    </p>
  </div>
  <EmailStatusBadge status={b.email_status ?? "pending"} />
</Link>
```

### History Loading Skeleton

```tsx
// app/(app)/briefing/loading.tsx
export default function BriefingLoading() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse h-16 rounded-xl bg-coach-observation" />
      ))}
    </div>
  );
}
```

### Detail Page — RSC Pattern

```tsx
// app/(app)/briefing/[id]/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BriefingDetailContent } from "@/components/briefing/BriefingDetailContent";

export default async function BriefingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles").select("name, briefing_time").eq("id", user.id).single();
  if (!profile) redirect("/onboarding");

  const { data: briefing, error } = await supabase
    .from("briefings")
    .select("id, content, helpful, briefing_date, email_status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !briefing) redirect("/briefing");

  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-4">
      <BriefingDetailContent briefing={briefing} />
    </div>
  );
}
```

### Testing — Patterns from Story 4.2

**BriefingCard feedback tests** (add to existing `BriefingCard.test.tsx`):

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("shows feedback buttons when onFeedback is provided", () => {
  render(<BriefingCard variant="suggestion" domain="health" body="Test" onFeedback={vi.fn()} helpful={null} />);
  expect(screen.getByRole("button", { name: "Mark as helpful" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mark as not helpful" })).toBeInTheDocument();
});

it("does not show feedback buttons without onFeedback", () => {
  render(<BriefingCard variant="suggestion" domain="health" body="Test" />);
  expect(screen.queryByRole("button", { name: "Mark as helpful" })).toBeNull();
});

it("calls onFeedback(true) on thumbs-up click", async () => {
  const onFeedback = vi.fn();
  render(<BriefingCard variant="suggestion" domain="health" body="Test" onFeedback={onFeedback} helpful={null} />);
  await userEvent.click(screen.getByRole("button", { name: "Mark as helpful" }));
  expect(onFeedback).toHaveBeenCalledWith(true);
});

it("calls onFeedback(false) on thumbs-down click", async () => {
  const onFeedback = vi.fn();
  render(<BriefingCard variant="suggestion" domain="health" body="Test" onFeedback={onFeedback} helpful={null} />);
  await userEvent.click(screen.getByRole("button", { name: "Mark as not helpful" }));
  expect(onFeedback).toHaveBeenCalledWith(false);
});

it("marks thumbs-up aria-pressed when helpful=true", () => {
  render(<BriefingCard variant="suggestion" domain="health" body="Test" onFeedback={vi.fn()} helpful={true} />);
  expect(screen.getByRole("button", { name: "Mark as helpful" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Mark as not helpful" })).toHaveAttribute("aria-pressed", "false");
});
```

**BriefingDetailContent test** (mock fetch):
```tsx
global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });

it("calls PATCH API on feedback", async () => {
  render(<BriefingDetailContent briefing={{ id: "b1", content: mockContent, helpful: null, briefing_date: "2026-05-15" }} />);
  await userEvent.click(screen.getAllByRole("button", { name: "Mark as helpful" })[0]);
  expect(global.fetch).toHaveBeenCalledWith(
    "/api/briefing/b1",
    expect.objectContaining({ method: "PATCH" })
  );
});

it("shows pre-filled helpful state from props", () => {
  render(<BriefingDetailContent briefing={{ id: "b1", content: mockContent, helpful: true, briefing_date: "2026-05-15" }} />);
  screen.getAllByRole("button", { name: "Mark as helpful" }).forEach((btn) => {
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});
```

**History page test** (same mock pattern as dashboard):
```tsx
// Mock Supabase chain with gte, order methods in addition to eq, select
// Verify: briefing rows render with date and preview text
// Verify: empty state renders CoachVoiceLine when data is []
// Verify: auth redirect on unauthenticated
```

**Detail page test**:
```tsx
// Mock Supabase to return a briefing row
// Verify: BriefingDetailContent receives the briefing data (check greeting text renders)
// Verify: redirect("/briefing") when briefing not found (error from Supabase)
// Verify: auth redirect when user is null
```

### Supabase Mock Chain for New Pages

The history page query chain uses `gte` and `order` in addition to `eq`. Add these to the mock:
```ts
const q: Record<string, unknown> = {};
const ms = ["select", "eq", "gte", "lt", "order", "limit", "single", "maybeSingle"];
for (const m of ms) q[m] = (..._args: unknown[]) => q;
q.then = (resolve) => Promise.resolve({ data: mockBriefings, error: null }).then(resolve);
```

The list query uses `.then` (not `.maybeSingle`/`.single`) so the mock must have `.then` on the query chain for `from("briefings")`.

### Previous Story Learnings (4.2)

- `vi.mock()` factory is hoisted — never reference outer `const` in the factory; inline mock implementations
- `redirect()` in tests must throw (`new Error("NEXT_REDIRECT:/path")`); assert with `rejects.toThrow(...)`
- Tailwind v4 `bg-coach-observation`, `font-serif`, `text-primary`, `text-accent` all work as utility classes
- Co-located tests (beside component files) — not in `__tests__/` — except RSC page tests which go in `app/(app)/<route>/__tests__/`
- `maybeSingle()` for "might not exist", `single()` for "must exist"; use `single()` for detail page (redirect on not found)
- Test mock chains must include every method chained: if page adds `.gte()`, mock must have `gte` returning the chain

### Files to CREATE (new)

```
lib/briefing/content.ts
components/briefing/BriefingDetailContent.tsx
components/briefing/BriefingDetailContent.test.tsx
app/(app)/briefing/page.tsx
app/(app)/briefing/loading.tsx
app/(app)/briefing/__tests__/history-page.test.tsx
app/(app)/briefing/[id]/page.tsx
app/(app)/briefing/[id]/loading.tsx
app/(app)/briefing/[id]/__tests__/detail-page.test.tsx
```

### Files to UPDATE (modify existing)

```
components/briefing/BriefingCard.tsx       — add "use client", feedback props
components/briefing/BriefingCard.test.tsx  — add feedback tests
app/(app)/dashboard/page.tsx               — import from @/lib/briefing/content
```

### Files NOT to touch

```
app/api/briefing/route.ts          — complete from Story 4.1
app/api/briefing/[id]/route.ts     — complete from Story 4.1
components/shared/AiDisclosureWrapper.tsx  — no changes
components/briefing/CoachesObservation.tsx — no changes
components/briefing/BriefingCardSkeleton.tsx — no changes
```

### References

- Architecture: `app/(app)/briefing/`, `app/api/briefing/[id]/route.ts`, `BriefingCard` helpfulness section
- UX Spec: BriefingCard states (p.813), History page layout, Feedback patterns section
- Epics: Story 4.3 acceptance criteria (FR10, FR13)
- Story 4.1: API routes, briefings table schema, `helpful` column
- Story 4.2: BriefingCard, AiDisclosureWrapper, CoachesObservation, BriefingCardSkeleton — all reused

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `nextjs/link` must be mocked in vitest tests (`vi.mock("next/link", () => ({ default: ... }))`) because it uses client-side routing internally; without the mock, tests fail to render Link hrefs correctly.
- Supabase mock for history page list query uses `.then` (not `.single` / `.maybeSingle`) because the list query is awaited directly on the chain — the mock must attach `.then` to the terminal chain object returned by `order()`.
- `BriefingDetailContent` is a client component wrapping RSC pages — RSC passes serialized briefing data to it; the component owns all interactivity (state, fetch). This avoids making the RSC pages client-side.

### Completion Notes List

- All 5 tasks complete. 257/257 tests pass (34 new). `tsc --noEmit` clean.
- `lib/briefing/content.ts`: extracted `isValidContent`, `isSafeUrl`, `VALID_DOMAINS`, `BriefingContent`, `BriefingSuggestion` from dashboard inline definitions — single source of truth. `dashboard/page.tsx` updated to import from there; all 223 original tests still pass.
- `BriefingCard.tsx`: added `"use client"`, optional `helpful`/`onFeedback` props; feedback buttons appear via CSS `group-hover`/`focus-within` — no JS hover state needed; `aria-pressed` for accessible state communication; `DOMAIN_FILL` map drives colour for selected icon.
- `BriefingDetailContent.tsx`: client component managing shared `helpful` state for the detail view; optimistic update on PATCH; all suggestion cards share state so clicks on any card update all (consistent visual).
- `app/(app)/briefing/page.tsx`: RSC history list; safe date formatting avoids UTC midnight parsing bug; `isValidContent` guard before slicing greeting; inline `EmailStatusBadge`; empty state via `CoachVoiceLine`.
- `app/(app)/briefing/[id]/page.tsx`: RSC detail; redirects to `/briefing` when not found (not 404 page, avoids exposing route existence to unauthorized users).

### File List

- `lib/briefing/content.ts` — new (shared content utilities)
- `components/briefing/BriefingCard.tsx` — modified (added "use client", feedback props)
- `components/briefing/BriefingCard.test.tsx` — modified (added 6 feedback tests)
- `components/briefing/BriefingDetailContent.tsx` — new
- `components/briefing/BriefingDetailContent.test.tsx` — new
- `app/(app)/briefing/page.tsx` — new (history list RSC)
- `app/(app)/briefing/loading.tsx` — new
- `app/(app)/briefing/__tests__/history-page.test.tsx` — new
- `app/(app)/briefing/[id]/page.tsx` — new (detail RSC)
- `app/(app)/briefing/[id]/loading.tsx` — new
- `app/(app)/briefing/[id]/__tests__/detail-page.test.tsx` — new
- `app/(app)/dashboard/page.tsx` — modified (imports from @/lib/briefing/content)
- `_bmad-output/implementation-artifacts/4-3-briefing-history-and-helpfulness-feedback.md` — modified
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified

### Change Log

- 2026-05-15: Story created
- 2026-05-15: Implementation complete — 257 tests passing, tsc clean, all ACs satisfied
- 2026-05-15: Code review complete — 6 patches applied (isSafeUrl protocol-relative fix, 44px touch targets, formatDate guard, double-tap race prevention, target=_blank on links, null suggestion guard); 276 tests passing
