import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingPage from "../onboarding/page";

const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  global.fetch = vi.fn();
});

// ── Step 1 ────────────────────────────────────────────────────────────────────

describe("OnboardingPage — Step 1", () => {
  it("renders name and age fields", () => {
    render(<OnboardingPage />);
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^age$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("shows step indicator", () => {
    render(<OnboardingPage />);
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it("shows error when name is empty", async () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(screen.getByText(/enter your name/i)).toBeInTheDocument()
    );
  });

  it("shows error when age is below 18", async () => {
    render(<OnboardingPage />);
    await userEvent.type(screen.getByLabelText(/your name/i), "Alice");
    fireEvent.change(screen.getByLabelText(/^age$/i), { target: { value: "15" } });
    fireEvent.blur(screen.getByLabelText(/^age$/i));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(screen.getByText(/18 or older/i)).toBeInTheDocument()
    );
  });

  it("advances to step 2 with valid name and age", async () => {
    render(<OnboardingPage />);
    await userEvent.type(screen.getByLabelText(/your name/i), "Alice");
    fireEvent.change(screen.getByLabelText(/^age$/i), { target: { value: "28" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/monthly income/i)).toBeInTheDocument()
    );
  });
});

// ── Step 2 ────────────────────────────────────────────────────────────────────

async function goToStep2() {
  render(<OnboardingPage />);
  await userEvent.type(screen.getByLabelText(/your name/i), "Alice");
  fireEvent.change(screen.getByLabelText(/^age$/i), { target: { value: "28" } });
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await waitFor(() => screen.getByLabelText(/monthly income/i));
}

describe("OnboardingPage — Step 2", () => {
  it("shows budget fields", async () => {
    await goToStep2();
    expect(screen.getByLabelText(/monthly income/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fixed expenses/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/discretionary budget/i)).toBeInTheDocument();
  });

  it("shows back button", async () => {
    await goToStep2();
    expect(screen.getByRole("button", { name: /← back/i })).toBeInTheDocument();
  });

  it("back button returns to step 1", async () => {
    await goToStep2();
    fireEvent.click(screen.getByRole("button", { name: /← back/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
    );
  });

  it("advances to step 3", async () => {
    await goToStep2();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(screen.getByText(/goal areas/i)).toBeInTheDocument()
    );
  });
});

// ── Step 3 ────────────────────────────────────────────────────────────────────

async function goToStep3() {
  await goToStep2();
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await waitFor(() => screen.getByText(/goal areas/i));
}

describe("OnboardingPage — Step 3", () => {
  it("shows domain chip selector", async () => {
    await goToStep3();
    expect(screen.getByRole("checkbox", { name: /health/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /finance/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /wellness/i })).toBeInTheDocument();
  });

  it("shows error if no domain selected on continue", async () => {
    await goToStep3();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(screen.getByText(/at least one goal domain/i)).toBeInTheDocument()
    );
  });

  it("shows goal title input after selecting a domain", async () => {
    await goToStep3();
    fireEvent.click(screen.getByRole("checkbox", { name: /health/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/health goal/i)).toBeInTheDocument()
    );
  });

  it("shows error if domain selected but title empty", async () => {
    await goToStep3();
    fireEvent.click(screen.getByRole("checkbox", { name: /health/i }));
    await waitFor(() => screen.getByLabelText(/health goal/i));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(screen.getByText(/goal title for health/i)).toBeInTheDocument()
    );
  });
});

// ── Step 5 (consent) ──────────────────────────────────────────────────────────

async function goToStep5() {
  await goToStep3();
  fireEvent.click(screen.getByRole("checkbox", { name: /health/i }));
  await waitFor(() => screen.getByLabelText(/health goal/i));
  await userEvent.type(screen.getByLabelText(/health goal/i), "Run 5k");
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await waitFor(() => screen.getByLabelText(/briefing time/i));
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await waitFor(() => screen.getByText(/what we collect/i));
}

describe("OnboardingPage — Step 5 (consent)", () => {
  it("shows GDPR consent prose and checkbox", async () => {
    await goToStep5();
    expect(screen.getByText(/what we collect/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/i understand and agree/i)).toBeInTheDocument();
  });

  it("consent checkbox is required to submit", async () => {
    await goToStep5();
    fireEvent.click(screen.getByRole("button", { name: /start my journey/i }));
    await waitFor(() =>
      expect(screen.getByText(/must agree/i)).toBeInTheDocument()
    );
  });
});

// ── Full submit ───────────────────────────────────────────────────────────────

describe("OnboardingPage — Full submit", () => {
  it("calls profile + goals + consent APIs and pushes to /dashboard", async () => {
    mockPush.mockClear();

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { created: true } }) }) // POST /api/profile
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: "g1" } }) })      // POST /api/goals
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });                          // POST /api/cookie-consent

    await goToStep5();
    await userEvent.click(screen.getByLabelText(/i understand and agree/i));
    fireEvent.click(screen.getByRole("button", { name: /start my journey/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/profile",
        expect.objectContaining({ method: "POST" })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/goals",
        expect.objectContaining({ method: "POST" })
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows network error banner when profile save fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Profile save failed." } }),
    });

    await goToStep5();
    await userEvent.click(screen.getByLabelText(/i understand and agree/i));
    fireEvent.click(screen.getByRole("button", { name: /start my journey/i }));

    await waitFor(() =>
      expect(screen.getByText(/profile save failed/i)).toBeInTheDocument()
    );
  });
});
