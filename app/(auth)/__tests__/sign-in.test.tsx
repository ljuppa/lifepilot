import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInPage from "../sign-in/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => (key === "redirect" ? "/dashboard" : null) }),
}));

beforeEach(() => {
  global.fetch = vi.fn();
});

describe("SignInPage", () => {
  it("renders the sign-in form", () => {
    render(<SignInPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("clears password and retains email on invalid credentials", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } }),
    });

    render(<SignInPage />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpassword");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/email or password is incorrect/i)).toBeInTheDocument()
    );

    // Email retained, password cleared
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe("user@example.com");
    expect((screen.getByLabelText(/password/i) as HTMLInputElement).value).toBe("");
  });

  it("shows generic error on network failure and clears password", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network"));

    render(<SignInPage />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "somepassword");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect((screen.getByLabelText(/password/i) as HTMLInputElement).value).toBe("");
  });
});
