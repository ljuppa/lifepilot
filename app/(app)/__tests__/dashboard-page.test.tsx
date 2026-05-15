import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../dashboard/page";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { createClient } from "@/utils/supabase/server";

const mockProfile = { name: "Alice", briefing_time: "07:00" };

const mockBriefingContent = {
  greeting: "Good morning, Alice. Here is your Thursday.",
  suggestions: [
    { domain: "health", title: "Walk", body: "A 30-minute walk improves energy levels.", action_link_text: null, action_link_url: null },
    { domain: "finance", title: "Budget", body: "Review your weekly budget today.", action_link_text: "Open tracker", action_link_url: "/checkin" },
  ],
  observation: null,
};

function makeSupabase({
  user = { id: "user-1" },
  profile = mockProfile,
  briefing = null as unknown,
  briefingCount = 0,
} = {}) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "single", "maybeSingle", "insert", "update"];
  for (const m of methods) chain[m] = (..._args: unknown[]) => chain;
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null, count: null }).then(resolve);

  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: user },
        error: null,
      }),
    },
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      const ms = ["select", "eq", "order", "limit", "insert", "update"];
      for (const m of ms) q[m] = (..._args: unknown[]) => q;

      q.single = async () =>
        table === "profiles"
          ? { data: profile, error: null }
          : { data: null, error: null };

      q.maybeSingle = async () =>
        table === "briefings"
          ? { data: briefing, error: null }
          : { data: null, error: null };

      // handle count query
      const countQ: Record<string, unknown> = {};
      const cMs = ["select", "eq", "lt"];
      for (const m of cMs) countQ[m] = (..._args: unknown[]) => countQ;
      countQ.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ count: briefingCount, error: null }).then(resolve);

      if (table === "briefings") {
        q.select = (...args: unknown[]) => {
          const selectArgs = args as [string, unknown?];
          if (typeof selectArgs[1] === "object" && selectArgs[1] !== null && (selectArgs[1] as { head?: boolean }).head) {
            return countQ;
          }
          return q;
        };
      }

      return q;
    },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("DashboardPage — authenticated with briefing", () => {
  it("renders greeting card from briefing content", async () => {
    makeSupabase({ briefing: { id: "b1", content: mockBriefingContent }, briefingCount: 5 });
    render(await DashboardPage());
    expect(screen.getByText("Good morning, Alice. Here is your Thursday.")).toBeInTheDocument();
  });

  it("renders suggestion cards for each domain", async () => {
    makeSupabase({ briefing: { id: "b1", content: mockBriefingContent }, briefingCount: 5 });
    render(await DashboardPage());
    expect(screen.getByText("A 30-minute walk improves energy levels.")).toBeInTheDocument();
    expect(screen.getByText("Review your weekly budget today.")).toBeInTheDocument();
  });

  it("renders action link when present in suggestion", async () => {
    makeSupabase({ briefing: { id: "b1", content: mockBriefingContent }, briefingCount: 5 });
    render(await DashboardPage());
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/checkin");
  });

  it("renders AI disclosure footer", async () => {
    makeSupabase({ briefing: { id: "b1", content: mockBriefingContent }, briefingCount: 5 });
    render(await DashboardPage());
    expect(screen.getByText(/AI-generated/)).toBeInTheDocument();
  });

  it("renders CoachesObservation when observation is non-null", async () => {
    const contentWithObs = { ...mockBriefingContent, observation: "You've been consistent — what's driving that?" };
    makeSupabase({ briefing: { id: "b1", content: contentWithObs }, briefingCount: 5 });
    render(await DashboardPage());
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText("You've been consistent — what's driving that?")).toBeInTheDocument();
  });

  it("does not render CoachesObservation when observation is null", async () => {
    makeSupabase({ briefing: { id: "b1", content: mockBriefingContent }, briefingCount: 5 });
    render(await DashboardPage());
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("DashboardPage — empty states", () => {
  it("shows first-time empty state when no briefings ever", async () => {
    makeSupabase({ briefing: null, briefingCount: 0 });
    render(await DashboardPage());
    expect(screen.getByText(/Your first briefing arrives tomorrow at 07:00/)).toBeInTheDocument();
  });

  it("shows generating state when briefings exist but none today", async () => {
    makeSupabase({ briefing: null, briefingCount: 3 });
    render(await DashboardPage());
    expect(screen.getByText(/Your briefing is generating/)).toBeInTheDocument();
  });
});

describe("DashboardPage — auth guards", () => {
  it("redirects to /sign-in when unauthenticated", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error("unauth") }) },
    });
    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  });

  it("redirects to /onboarding when profile is missing", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
      from: (table: string) => {
        const q: Record<string, unknown> = {};
        const ms = ["select", "eq", "order", "limit"];
        for (const m of ms) q[m] = () => q;
        q.single = async () =>
          table === "profiles" ? { data: null, error: new Error("no profile") } : { data: null, error: null };
        q.maybeSingle = async () => ({ data: null, error: null });
        const countQ: Record<string, unknown> = {};
        ["select", "eq", "lt"].forEach((m) => { countQ[m] = () => countQ; });
        countQ.then = (r: (v: unknown) => unknown) => Promise.resolve({ count: 0 }).then(r);
        if (table === "briefings") {
          q.select = (_s: string, opts?: { head?: boolean }) =>
            opts?.head ? countQ : q;
        }
        return q;
      },
    });
    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });
});
