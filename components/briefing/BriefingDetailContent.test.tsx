import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BriefingDetailContent } from "./BriefingDetailContent";

const mockContent = {
  greeting: "Good morning. Here is your Friday.",
  suggestions: [
    { domain: "health", title: "Walk", body: "Take a walk outside today.", action_link_text: null, action_link_url: null },
    { domain: "finance", title: "Budget", body: "Review your budget.", action_link_text: "Open tracker", action_link_url: "/checkin" },
  ],
  observation: null,
};

const mockBriefing = {
  id: "briefing-1",
  content: mockContent,
  helpful: null as boolean | null,
  briefing_date: "2026-05-15",
};

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
});

describe("BriefingDetailContent", () => {
  it("renders greeting card", () => {
    render(<BriefingDetailContent briefing={mockBriefing} />);
    expect(screen.getByText("Good morning. Here is your Friday.")).toBeInTheDocument();
  });

  it("renders suggestion cards", () => {
    render(<BriefingDetailContent briefing={mockBriefing} />);
    expect(screen.getByText("Take a walk outside today.")).toBeInTheDocument();
    expect(screen.getByText("Review your budget.")).toBeInTheDocument();
  });

  it("renders AI disclosure footer", () => {
    render(<BriefingDetailContent briefing={mockBriefing} />);
    expect(screen.getByText(/AI-generated/)).toBeInTheDocument();
  });

  it("renders feedback buttons on suggestion cards", () => {
    render(<BriefingDetailContent briefing={mockBriefing} />);
    const helpfulBtns = screen.getAllByRole("button", { name: "Mark as helpful" });
    expect(helpfulBtns).toHaveLength(2);
  });

  it("calls PATCH API with helpful=true when thumbs-up clicked", async () => {
    render(<BriefingDetailContent briefing={mockBriefing} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Mark as helpful" })[0]);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/briefing/briefing-1",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful: true }),
      })
    );
  });

  it("calls PATCH API with helpful=false when thumbs-down clicked", async () => {
    render(<BriefingDetailContent briefing={mockBriefing} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Mark as not helpful" })[0]);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/briefing/briefing-1",
      expect.objectContaining({ body: JSON.stringify({ helpful: false }) })
    );
  });

  it("pre-fills helpful=true state from props", () => {
    render(<BriefingDetailContent briefing={{ ...mockBriefing, helpful: true }} />);
    screen.getAllByRole("button", { name: "Mark as helpful" }).forEach((btn) => {
      expect(btn).toHaveAttribute("aria-pressed", "true");
    });
    screen.getAllByRole("button", { name: "Mark as not helpful" }).forEach((btn) => {
      expect(btn).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("pre-fills helpful=false state from props", () => {
    render(<BriefingDetailContent briefing={{ ...mockBriefing, helpful: false }} />);
    screen.getAllByRole("button", { name: "Mark as helpful" }).forEach((btn) => {
      expect(btn).toHaveAttribute("aria-pressed", "false");
    });
    screen.getAllByRole("button", { name: "Mark as not helpful" }).forEach((btn) => {
      expect(btn).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("updates all suggestion cards to same helpful state after click", async () => {
    render(<BriefingDetailContent briefing={mockBriefing} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Mark as helpful" })[0]);
    screen.getAllByRole("button", { name: "Mark as helpful" }).forEach((btn) => {
      expect(btn).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("renders CoachesObservation when observation is non-null", () => {
    const withObs = { ...mockBriefing, content: { ...mockContent, observation: "Great consistency this week!" } };
    render(<BriefingDetailContent briefing={withObs} />);
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText("Great consistency this week!")).toBeInTheDocument();
  });

  it("returns null when content is invalid", () => {
    const { container } = render(<BriefingDetailContent briefing={{ ...mockBriefing, content: null }} />);
    expect(container.firstChild).toBeNull();
  });
});
