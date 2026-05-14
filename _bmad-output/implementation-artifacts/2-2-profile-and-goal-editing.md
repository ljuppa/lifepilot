# Story 2.2: Profile & Goal Editing

## Status: backlog

## Story

As a signed-in user who has completed onboarding,
I want to edit my personal profile, budget details, and active goals at any time,
So that my AI coach always reflects my current situation and priorities.

## Acceptance Criteria

**AC1:** Given I navigate to `/profile`, when the page loads, then a skeleton card is shown while data fetches; once loaded, all current profile values are pre-populated in the edit form.

**AC2:** Given I change one or more profile fields and tap "Save", when `PATCH /api/profile` succeeds, then the field border briefly turns sage green and the label reads "Saved" for 2 seconds; no page reload; no toast.

**AC3:** Given I have made unsaved profile changes and attempt to navigate away, when the navigation event fires, then a Dialog appears: "You have unsaved changes. Leave?" with "Stay" and "Leave anyway" buttons.

**AC4:** Given I navigate to `/goals`, when the page loads, then my current active goals are listed with domain chip labels, goal titles, and Edit / Remove actions; empty state CoachVoiceLine if no goals exist.

**AC5:** Given I tap "Add goal" and fewer than 3 active goals exist, when the add goal form appears, then it shows a DomainChip selector and goal title input; on save, goal is created and list refreshes inline.

**AC6:** Given I already have 3 active goals, when I view the goals page, then the "Add goal" button is disabled with label "You've reached the maximum of 3 active goals".

**AC7:** Given I tap "Remove" on a goal and confirm, when `DELETE /api/goals/[id]` succeeds, then the goal is soft-deleted (status: 'inactive') and disappears from the list.

**AC8:** Given any `/api/profile` or `/api/goals` route is called, when the handler runs, then session is verified; all queries use `user.id`; unauthenticated calls return HTTP 401.

## Tasks / Subtasks

- [ ] Task 1: Profile editing page `/profile`
- [ ] Task 2: Goals management page `/goals`
- [ ] Task 3: PATCH /api/profile route
- [ ] Task 4: PATCH and DELETE /api/goals/[id] routes
- [ ] Task 5: Unsaved changes Dialog
- [ ] Task 6: Tests

## Dev Notes

- **FRs:** FR3, FR4, FR5, FR6
- **UX:** UX-DR13 (2s "Saved" inline confirmation), UX-DR14 (empty states), UX-DR15 (skeleton loading)
- Use SWR for data fetching on profile and goals pages
- Inline "Saved" confirmation: field border → sage, label "Saved" for 2s, then reset (no toast)

## Dev Agent Record

### Completion Notes
_To be filled on completion_

## File List
_To be filled on completion_

## Change Log
- 2026-05-14: Story file created
