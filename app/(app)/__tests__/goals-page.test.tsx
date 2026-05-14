import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GoalsPage from "../goals/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockGoals = [
  { id: "g1", domain: "health", title: "Run 5k", status: "active" },
  { id: "g2", domain: "finance", title: "Save $500/mo", status: "active" },
];

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: [] }),
  });
});

async function waitForLoad() {
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: /your goals/i })).toBeInTheDocument()
  );
}

// ── Loading state ──────────────────────────────────────────────────────────────

describe("GoalsPage — Loading state", () => {
  it("hides action buttons and goal list while loading", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<GoalsPage />);
    // "Add goal" button only appears after data loads
    expect(screen.queryByRole("button", { name: /add goal/i })).not.toBeInTheDocument();
    // No goals list rendered yet
    expect(screen.queryByRole("list", { name: /active goals/i })).not.toBeInTheDocument();
  });
});

// ── Empty state ────────────────────────────────────────────────────────────────

describe("GoalsPage — Empty state", () => {
  it("shows empty state CoachVoiceLine when no goals exist", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    render(<GoalsPage />);
    await waitForLoad();
    expect(screen.getByText(/no active goals yet/i)).toBeInTheDocument();
  });

  it("shows Add goal button when under limit", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    expect(screen.getByRole("button", { name: /add goal/i })).toBeInTheDocument();
  });
});

// ── Goals list ─────────────────────────────────────────────────────────────────

describe("GoalsPage — Goals list", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockGoals }),
    });
  });

  it("renders each goal title", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    expect(screen.getByText("Run 5k")).toBeInTheDocument();
    expect(screen.getByText("Save $500/mo")).toBeInTheDocument();
  });

  it("renders domain chips for each goal", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
  });

  it("shows Remove button for each goal", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    const removeButtons = screen.getAllByRole("button", { name: /^remove$/i });
    expect(removeButtons).toHaveLength(2);
  });

  it("shows max-limit message when 3 goals exist", async () => {
    const threeGoals = [
      ...mockGoals,
      { id: "g3", domain: "wellness", title: "Sleep 8h", status: "active" },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: threeGoals }),
    });
    render(<GoalsPage />);
    await waitForLoad();
    expect(screen.getByText(/maximum of 3 active goals/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add goal/i })).not.toBeInTheDocument();
  });
});

// ── Remove flow ────────────────────────────────────────────────────────────────

describe("GoalsPage — Remove goal", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockGoals }) }) // initial GET
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { deleted: true } }) }); // DELETE
  });

  it("shows Confirm and Cancel buttons after clicking Remove", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("restores Remove button if Cancel is clicked", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[0]);
    await waitFor(() => screen.getByRole("button", { name: /confirm/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /^remove$/i })).toHaveLength(2)
    );
  });

  it("removes goal from list after Confirm", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[0]);
    await waitFor(() => screen.getByRole("button", { name: /confirm/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() =>
      expect(screen.queryByText("Run 5k")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Save $500/mo")).toBeInTheDocument();
  });

  it("calls DELETE /api/goals/[id] on confirm", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[0]);
    await waitFor(() => screen.getByRole("button", { name: /confirm/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/goals/g1", { method: "DELETE" })
    );
  });
});

// ── Add goal form ──────────────────────────────────────────────────────────────

describe("GoalsPage — Add goal", () => {
  it("shows add form when '+ Add goal' is clicked", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByRole("button", { name: /add goal/i }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: /goal title/i })).toBeInTheDocument()
    );
  });

  it("hides add form when Cancel is clicked", async () => {
    render(<GoalsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByRole("button", { name: /add goal/i }));
    await waitFor(() => screen.getByRole("textbox", { name: /goal title/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: /goal title/i })).not.toBeInTheDocument()
    );
  });

  it("adds goal to list after saving", async () => {
    const newGoal = { id: "g3", domain: "wellness", title: "Sleep 8h", status: "active" };
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })     // initial GET
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: newGoal }) }); // POST

    render(<GoalsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByRole("button", { name: /add goal/i }));
    await waitFor(() => screen.getByRole("textbox", { name: /goal title/i }));

    fireEvent.click(screen.getByRole("checkbox", { name: /wellness/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /goal title/i }), "Sleep 8h");
    fireEvent.click(screen.getByRole("button", { name: /save goal/i }));

    await waitFor(() =>
      expect(screen.getByText("Sleep 8h")).toBeInTheDocument()
    );
  });
});
