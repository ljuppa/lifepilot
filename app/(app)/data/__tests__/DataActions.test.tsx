import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import DataActions from "../DataActions";

// Mock window.location.href assignment
const locationSpy = vi.spyOn(window, "location", "get");
const mockLocationAssign = vi.fn();
locationSpy.mockReturnValue({ ...window.location, href: "" } as Location);
Object.defineProperty(window, "location", {
  writable: true,
  value: { href: "" },
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DataActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    window.location.href = "";
  });

  // ─── Export section ───────────────────────────────────────────────────────

  it("shows 'Request data export' button initially", () => {
    render(<DataActions />);
    expect(screen.getByRole("button", { name: /request data export/i })).toBeInTheDocument();
  });

  it("shows success message after export request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<DataActions />);
    fireEvent.click(screen.getByRole("button", { name: /request data export/i }));
    await waitFor(() => {
      expect(screen.getByText(/export is being prepared/i)).toBeInTheDocument();
    });
  });

  it("shows error banner when export fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Export limit reached." } }),
    });
    render(<DataActions />);
    fireEvent.click(screen.getByRole("button", { name: /request data export/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Export limit reached.");
    });
  });

  // ─── Delete section ───────────────────────────────────────────────────────

  it("shows 'Delete my account' button", () => {
    render(<DataActions />);
    expect(screen.getByRole("button", { name: /delete my account$/i })).toBeInTheDocument();
  });

  it("opens confirmation dialog when delete button is clicked", () => {
    render(<DataActions />);
    fireEvent.click(screen.getByRole("button", { name: /delete my account$/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/this cannot be undone/i)).toBeInTheDocument();
  });

  it("closes dialog when 'Keep my account' is clicked", async () => {
    render(<DataActions />);
    fireEvent.click(screen.getByRole("button", { name: /delete my account$/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /keep my account/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("calls DELETE /api/profile when confirm button is clicked", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { deleted: true } }) });
    render(<DataActions />);
    fireEvent.click(screen.getByRole("button", { name: /delete my account$/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete my account permanently/i }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/profile", { method: "DELETE" });
    });
  });

  it("redirects to /sign-in?message=account_deleted on successful deletion", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { deleted: true } }) });
    render(<DataActions />);
    fireEvent.click(screen.getByRole("button", { name: /delete my account$/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete my account permanently/i }));
    await waitFor(() => {
      expect(window.location.href).toBe("/sign-in?message=account_deleted");
    });
  });

  it("shows error banner and closes dialog on deletion failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Deletion failed." } }),
    });
    render(<DataActions />);
    fireEvent.click(screen.getByRole("button", { name: /delete my account$/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete my account permanently/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
    });
  });
});
