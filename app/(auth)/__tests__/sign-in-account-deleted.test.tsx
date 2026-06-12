import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SignInPage from "../sign-in/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "message") return "account_deleted";
      if (key === "redirect") return "/dashboard";
      return null;
    },
  }),
}));

describe("SignInPage — account deleted message", () => {
  it("shows CoachVoiceLine when message=account_deleted is in URL", () => {
    render(<SignInPage />);
    expect(
      screen.getByText(/your account has been permanently deleted/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/we're sorry to see you go/i)).toBeInTheDocument();
  });

  it("still shows the sign-in form alongside the message", () => {
    render(<SignInPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
