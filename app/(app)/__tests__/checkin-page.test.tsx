import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckinPage from "../checkin/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Suppress localStorage not available warnings in jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });

const mockGoals = [
  { id: "g1", domain: "health", title: "Run 5k", status: "active" },
];

beforeEach(() => {
  localStorageMock.clear();
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockGoals }) })  // GET /api/goals
    .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });         // GET /api/checkin
});

async function waitForForm() {
  await waitFor(() =>
    expect(screen.getByRole("radiogroup", { name: /how are you feeling today/i })).toBeInTheDocument()
  );
}

describe("CheckinPage — Loading state", () => {
  it("shows skeleton before data loads", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<CheckinPage />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });
});

describe("CheckinPage — Form", () => {
  it("renders MoodSelector after load", async () => {
    render(<CheckinPage />);
    await waitForForm();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("shows CoachVoiceLine opening", async () => {
    render(<CheckinPage />);
    await waitForForm();
    expect(screen.getByText(/how's it going today/i)).toBeInTheDocument();
  });

  it("shows health metric input when health goal active", async () => {
    render(<CheckinPage />);
    await waitForForm();
    expect(screen.getByLabelText(/weight today/i)).toBeInTheDocument();
  });

  it("shows 'Complete check-in' submit button", async () => {
    render(<CheckinPage />);
    await waitForForm();
    expect(screen.getByRole("button", { name: /complete check-in/i })).toBeInTheDocument();
  });

  it("shows mood error when submitting without selecting mood", async () => {
    render(<CheckinPage />);
    await waitForForm();
    fireEvent.click(screen.getByRole("button", { name: /complete check-in/i }));
    await waitFor(() =>
      expect(screen.getByText(/please select your mood/i)).toBeInTheDocument()
    );
  });

  it("calls POST /api/checkin with mood on submit", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockGoals }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: "c1", mood: 3 } }) });

    render(<CheckinPage />);
    await waitForForm();

    fireEvent.click(screen.getByRole("radio", { name: "Mood 3 of 5" }));
    fireEvent.click(screen.getByRole("button", { name: /complete check-in/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/checkin",
        expect.objectContaining({ method: "POST" })
      )
    );
  });

  it("shows closing CoachVoiceLine after successful submit", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockGoals }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: "c1", mood: 2 } }) });

    render(<CheckinPage />);
    await waitForForm();

    fireEvent.click(screen.getByRole("radio", { name: "Mood 2 of 5" }));
    fireEvent.click(screen.getByRole("button", { name: /complete check-in/i }));

    await waitFor(() =>
      expect(screen.getByText(/i'll adjust tomorrow's briefing/i)).toBeInTheDocument()
    );
  });
});

describe("CheckinPage — Already checked in", () => {
  it("shows 'already checked in' message when today's checkin exists", async () => {
    const todayCheckin = { checked_in_at: new Date().toISOString() };
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockGoals }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [todayCheckin] }) });

    render(<CheckinPage />);
    await waitFor(() =>
      expect(screen.getByText(/you've already checked in today/i)).toBeInTheDocument()
    );
  });
});

describe("CheckinPage — Offline queue", () => {
  it("shows offline banner when submit fails with network error", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockGoals }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockRejectedValueOnce(new Error("Network error"));

    render(<CheckinPage />);
    await waitForForm();

    fireEvent.click(screen.getByRole("radio", { name: "Mood 1 of 5" }));
    fireEvent.click(screen.getByRole("button", { name: /complete check-in/i }));

    await waitFor(() =>
      expect(screen.getByText(/saved offline/i)).toBeInTheDocument()
    );
  });

  it("shows conflict screen when a queued checkin exists", async () => {
    // Pre-populate queue
    const queued = { mood: 4, checked_in_at: new Date(Date.now() - 60_000).toISOString() };
    localStorageMock.setItem("lifepilot_checkin_queue", JSON.stringify([queued]));

    render(<CheckinPage />);
    await waitFor(() =>
      expect(screen.getByText(/waiting to sync/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /sync now/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /replace/i })).toBeInTheDocument();
  });

  it("shows form after discarding queued checkin", async () => {
    const queued = { mood: 4, checked_in_at: new Date(Date.now() - 60_000).toISOString() };
    localStorageMock.setItem("lifepilot_checkin_queue", JSON.stringify([queued]));

    render(<CheckinPage />);
    await waitFor(() => screen.getByRole("button", { name: /replace/i }));
    fireEvent.click(screen.getByRole("button", { name: /replace/i }));

    await waitFor(() =>
      expect(screen.getByRole("radiogroup", { name: /how are you feeling today/i })).toBeInTheDocument()
    );
  });
});

describe("CheckinPage — Note field", () => {
  it("shows character counter on the note field", async () => {
    render(<CheckinPage />);
    await waitForForm();
    expect(screen.getByText("0/80")).toBeInTheDocument();
  });

  it("updates character counter as user types", async () => {
    render(<CheckinPage />);
    await waitForForm();
    await userEvent.type(screen.getByLabelText(/anything else/i), "hello");
    expect(screen.getByText("5/80")).toBeInTheDocument();
  });
});
