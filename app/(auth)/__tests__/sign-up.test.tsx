import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignUpPage from "../sign-up/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

beforeEach(() => {
  global.fetch = vi.fn();
});

describe("SignUpPage", () => {
  it("renders the sign-up form", () => {
    render(<SignUpPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/18 years/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows inline error for short password", async () => {
    render(<SignUpPage />);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(passwordInput, "short");
    fireEvent.blur(passwordInput);
    await waitFor(() =>
      expect(screen.getByText(/8 characters/i)).toBeInTheDocument()
    );
  });

  it("shows age confirmation error when unchecked", async () => {
    render(<SignUpPage />);
    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "validpassword");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText(/18 or older/i)).toBeInTheDocument()
    );
  });

  it("shows success screen after successful sign-up", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { email: "user@example.com", emailSent: true } }),
    });

    render(<SignUpPage />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "securepassword");
    await userEvent.click(screen.getByLabelText(/18 years/i));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument();
  });

  it("shows amber error banner on network failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

    render(<SignUpPage />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "securepassword");
    await userEvent.click(screen.getByLabelText(/18 years/i));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument()
    );
    expect(screen.getByText(/couldn't create your account/i)).toBeInTheDocument();
  });
});
