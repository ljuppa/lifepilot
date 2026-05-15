import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BriefingDetailPage from "../page";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { createClient } from "@/utils/supabase/server";

const mockContent = {
  greeting: "Good morning. Here is your briefing for Thursday.",
  suggestions: [
    { domain: "health", title: "Walk", body: "Take a 30-minute walk.", action_link_text: null, action_link_url: null },
  ],
  observation: null,
};

const mockBriefing = {
  id: "b1",
  content: mockContent,
  helpful: null,
  briefing_date: "2026-05-15",
  email_status: "delivered",
};

function makeSupabase({
  user = { id: "user-1" },
  profile = { name: "Alice", briefing_time: "07:00" } as { name: string; briefing_time: string } | null,
  briefing = mockBriefing as typeof mockBriefing | null,
} = {}) {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      const ms = ["select", "eq", "order", "limit"];
      for (const m of ms) q[m] = (..._args: unknown[]) => q;

      q.single = async () => {
        if (table === "profiles") {
          return profile
            ? { data: profile, error: null }
            : { data: null, error: new Error("not found") };
        }
        if (table === "briefings") {
          return briefing
            ? { data: briefing, error: null }
            : { data: null, error: new Error("not found") };
        }
        return { data: null, error: null };
      };

      return q;
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
});

const mockParams = Promise.resolve({ id: "b1" });

describe("BriefingDetailPage — with briefing", () => {
  it("renders the briefing greeting", async () => {
    makeSupabase();
    render(await BriefingDetailPage({ params: mockParams }));
    expect(screen.getByText("Good morning. Here is your briefing for Thursday.")).toBeInTheDocument();
  });

  it("renders suggestion card", async () => {
    makeSupabase();
    render(await BriefingDetailPage({ params: mockParams }));
    expect(screen.getByText("Take a 30-minute walk.")).toBeInTheDocument();
  });

  it("renders AI disclosure footer", async () => {
    makeSupabase();
    render(await BriefingDetailPage({ params: mockParams }));
    expect(screen.getByText(/AI-generated/)).toBeInTheDocument();
  });

  it("renders helpfulness feedback buttons", async () => {
    makeSupabase();
    render(await BriefingDetailPage({ params: mockParams }));
    expect(screen.getByRole("button", { name: "Mark as helpful" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as not helpful" })).toBeInTheDocument();
  });
});

describe("BriefingDetailPage — auth guards", () => {
  it("redirects to /sign-in when unauthenticated", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error("unauth") }) },
    });
    await expect(BriefingDetailPage({ params: mockParams })).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  });

  it("redirects to /onboarding when profile is missing", async () => {
    makeSupabase({ profile: null });
    await expect(BriefingDetailPage({ params: mockParams })).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("redirects to /briefing when briefing is not found", async () => {
    makeSupabase({ briefing: null });
    await expect(BriefingDetailPage({ params: mockParams })).rejects.toThrow("NEXT_REDIRECT:/briefing");
  });
});
