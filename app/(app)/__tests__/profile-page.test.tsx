import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "../profile/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockProfile = {
  name: "Alice",
  age: 28,
  location: "London",
  briefing_time: "07:00",
  timezone: "Europe/London",
};

function mockFetchLoaded(profile = mockProfile) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: profile }),
  });
}

beforeEach(() => {
  global.fetch = vi.fn();
  // Default: profile fetch succeeds
  mockFetchLoaded();
});

async function waitForForm() {
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: /your profile/i })).toBeInTheDocument()
  );
}

describe("ProfilePage — Loading state", () => {
  it("shows skeleton before data loads", () => {
    // Mock a never-resolving fetch to keep the skeleton visible
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<ProfilePage />);
    // Form heading should not yet be visible
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
  });
});

describe("ProfilePage — Loaded state", () => {
  it("shows the profile form after data loads", async () => {
    render(<ProfilePage />);
    await waitForForm();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^age$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("pre-populates form with fetched profile data", async () => {
    render(<ProfilePage />);
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: /^name$/i })).toHaveValue("Alice")
    );
  });

  it("shows 'Saved ✓' after successful save", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: null }) }) // GET — no profile
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { updated: true } }) }); // PATCH

    render(<ProfilePage />);
    await waitForForm();

    await userEvent.type(screen.getByRole("textbox", { name: /^name$/i }), "Alice");

    // requestSubmit() triggers the form's submit event directly, which React's onSubmit captures
    const form = screen.getByRole("textbox", { name: /^name$/i }).closest("form")!;
    form.requestSubmit();

    await waitFor(() =>
      expect(screen.getByText("Saved ✓")).toBeInTheDocument()
    );
  });

  it("calls PATCH /api/profile with form data on save", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { updated: true } }) });

    render(<ProfilePage />);
    await waitForForm();

    await userEvent.type(screen.getByRole("textbox", { name: /^name$/i }), "Alice");

    const form = screen.getByRole("textbox", { name: /^name$/i }).closest("form")!;
    form.requestSubmit();

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/profile",
        expect.objectContaining({ method: "PATCH" })
      )
    );
  });
});

describe("ProfilePage — Unsaved changes dialog", () => {
  it("shows dialog when cancelling with a dirty form", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProfile }),
    });

    render(<ProfilePage />);
    await waitForForm();

    // Dirty the form by changing the name
    const nameInput = screen.getByRole("textbox", { name: /^name$/i });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Bob");

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() =>
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    );
    expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();
  });

  it("closes dialog when 'Stay' is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProfile }),
    });

    render(<ProfilePage />);
    await waitForForm();

    const nameInput = screen.getByRole("textbox", { name: /^name$/i });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Bob");
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: /^stay$/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});
