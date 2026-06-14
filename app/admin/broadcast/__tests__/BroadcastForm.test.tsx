import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BroadcastForm from "../BroadcastForm";

vi.mock("@/components/ui/coach-voice-line", () => ({
  CoachVoiceLine: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="coach-voice-line">{children}</div>
  ),
}));

beforeEach(() => {
  global.fetch = vi.fn();
});

describe("BroadcastForm — rendering", () => {
  it("renders subject input and body textarea", () => {
    render(<BroadcastForm />);
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("renders Send broadcast button", () => {
    render(<BroadcastForm />);
    expect(screen.getByRole("button", { name: /send broadcast/i })).toBeInTheDocument();
  });

  it("shows 0/120 subject counter initially", () => {
    render(<BroadcastForm />);
    expect(screen.getByText("0/120")).toBeInTheDocument();
  });

  it("shows 0/2000 body counter initially", () => {
    render(<BroadcastForm />);
    expect(screen.getByText("0/2000")).toBeInTheDocument();
  });
});

describe("BroadcastForm — character counters", () => {
  it("updates subject counter as user types", async () => {
    const user = userEvent.setup();
    render(<BroadcastForm />);
    await user.type(screen.getByLabelText("Subject"), "Hello");
    expect(screen.getByText("5/120")).toBeInTheDocument();
  });

  it("updates body counter as user types", async () => {
    const user = userEvent.setup();
    render(<BroadcastForm />);
    await user.type(screen.getByLabelText("Message"), "Hi there");
    expect(screen.getByText("8/2000")).toBeInTheDocument();
  });
});

describe("BroadcastForm — submission states", () => {
  it("disables button and shows Sending… while request is in flight", async () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<BroadcastForm />);
    await user.type(screen.getByLabelText("Subject"), "Hello");
    await user.type(screen.getByLabelText("Message"), "World");
    await user.click(screen.getByRole("button", { name: /send broadcast/i }));
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
  });

  it("shows CoachVoiceLine success message on successful submission", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { message: "Broadcast queued — users will receive it shortly." } }),
    });
    const user = userEvent.setup();
    render(<BroadcastForm />);
    await user.type(screen.getByLabelText("Subject"), "Hello");
    await user.type(screen.getByLabelText("Message"), "World");
    await user.click(screen.getByRole("button", { name: /send broadcast/i }));
    await waitFor(() => expect(screen.getByTestId("coach-voice-line")).toBeInTheDocument());
    expect(screen.getByText("Broadcast queued — users will receive it shortly.")).toBeInTheDocument();
  });

  it("resets subject and body fields after successful submission", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { message: "Broadcast queued — users will receive it shortly." } }),
    });
    const user = userEvent.setup();
    render(<BroadcastForm />);
    await user.type(screen.getByLabelText("Subject"), "Hello");
    await user.type(screen.getByLabelText("Message"), "World");
    await user.click(screen.getByRole("button", { name: /send broadcast/i }));
    await waitFor(() => expect(screen.getByTestId("coach-voice-line")).toBeInTheDocument());
    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows API error message on non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "Admin access required." } }),
    });
    const user = userEvent.setup();
    render(<BroadcastForm />);
    await user.type(screen.getByLabelText("Subject"), "Hello");
    await user.type(screen.getByLabelText("Message"), "World");
    await user.click(screen.getByRole("button", { name: /send broadcast/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("Admin access required.")).toBeInTheDocument();
  });

  it("shows network error message when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failed"));
    const user = userEvent.setup();
    render(<BroadcastForm />);
    await user.type(screen.getByLabelText("Subject"), "Hello");
    await user.type(screen.getByLabelText("Message"), "World");
    await user.click(screen.getByRole("button", { name: /send broadcast/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it("re-enables button after submission completes", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { message: "Broadcast queued — users will receive it shortly." } }),
    });
    const user = userEvent.setup();
    render(<BroadcastForm />);
    await user.type(screen.getByLabelText("Subject"), "Hello");
    await user.type(screen.getByLabelText("Message"), "World");
    await user.click(screen.getByRole("button", { name: /send broadcast/i }));
    await waitFor(() => expect(screen.getByTestId("coach-voice-line")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /send broadcast/i })).not.toBeDisabled();
  });
});
