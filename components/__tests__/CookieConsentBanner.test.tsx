import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CookieConsentBanner } from "../CookieConsentBanner";

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true });
});

describe("CookieConsentBanner", () => {
  it("renders for EU countries", () => {
    render(<CookieConsentBanner country="DE" />);
    expect(screen.getByRole("dialog", { name: /cookie consent/i })).toBeInTheDocument();
  });

  it("does not render for non-EU countries", () => {
    render(<CookieConsentBanner country="US" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when country is empty string", () => {
    render(<CookieConsentBanner country="" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dismisses and calls consent API on accept", async () => {
    render(<CookieConsentBanner country="FR" />);
    const button = screen.getByRole("button", { name: /accept/i });
    fireEvent.click(button);
    expect(global.fetch).toHaveBeenCalledWith("/api/cookie-consent", { method: "POST" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders for EEA country (Norway)", () => {
    render(<CookieConsentBanner country="NO" />);
    expect(screen.getByRole("dialog", { name: /cookie consent/i })).toBeInTheDocument();
  });
});
