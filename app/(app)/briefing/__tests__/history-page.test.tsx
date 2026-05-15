import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BriefingHistoryPage from "../page";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { createClient } from "@/utils/supabase/server";

const mockProfile = { name: "Alice", briefing_time: "07:00" };

const mockBriefings = [
  {
    id: "b1",
    briefing_date: "2026-05-15",
    content: { greeting: "Good morning, Alice. Here is your Thursday briefing.", suggestions: [], observation: null },
    email_status: "delivered",
    helpful: null,
  },
  {
    id: "b2",
    briefing_date: "2026-05-14",
    content: { greeting: "Good morning, Alice. Here is your Wednesday briefing.", suggestions: [], observation: null },
    email_status: "pending",
    helpful: true,
  },
];

function makeSupabase({
  user = { id: "user-1" },
  profile = mockProfile as typeof mockProfile | null,
  briefings = mockBriefings as unknown[],
} = {}) {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      const ms = ["select", "eq", "gte", "lt", "order", "limit"];
      for (const m of ms) q[m] = (..._args: unknown[]) => q;

      q.single = async () =>
        table === "profiles"
          ? { data: profile, error: profile ? null : new Error("not found") }
          : { data: null, error: null };

      q.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: briefings, error: null }).then(resolve);

      return q;
    },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("BriefingHistoryPage — with briefings", () => {
  it("renders a list of briefing rows", async () => {
    makeSupabase();
    render(await BriefingHistoryPage());
    expect(screen.getByText(/May 15, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/May 14, 2026/)).toBeInTheDocument();
  });

  it("renders preview text (first 100 chars of greeting)", async () => {
    makeSupabase();
    render(await BriefingHistoryPage());
    expect(screen.getByText(/Good morning, Alice. Here is your Thursday briefing./)).toBeInTheDocument();
  });

  it("renders email status badge for delivered", async () => {
    makeSupabase();
    render(await BriefingHistoryPage());
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("renders email status badge for pending", async () => {
    makeSupabase();
    render(await BriefingHistoryPage());
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders links to detail pages", async () => {
    makeSupabase();
    render(await BriefingHistoryPage());
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/briefing/b1");
    expect(hrefs).toContain("/briefing/b2");
  });
});

describe("BriefingHistoryPage — empty state", () => {
  it("shows empty CoachVoiceLine when no briefings", async () => {
    makeSupabase({ briefings: [] });
    render(await BriefingHistoryPage());
    expect(screen.getByText(/Your briefing history will appear here/)).toBeInTheDocument();
  });
});

describe("BriefingHistoryPage — malformed date", () => {
  it("renders raw string instead of Invalid Date when briefing_date is malformed", async () => {
    makeSupabase({
      briefings: [{ ...mockBriefings[0], briefing_date: "not-a-date" }],
    });
    render(await BriefingHistoryPage());
    expect(screen.getByText("not-a-date")).toBeInTheDocument();
  });
});

describe("BriefingHistoryPage — auth guards", () => {
  it("redirects to /sign-in when unauthenticated", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error("unauth") }) },
    });
    await expect(BriefingHistoryPage()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  });

  it("redirects to /onboarding when profile is missing", async () => {
    makeSupabase({ profile: null });
    await expect(BriefingHistoryPage()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });
});
