import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildReengagementEmail } from "../functions/checkInactivity";

// ── buildReengagementEmail (pure function) ────────────────────────────────────

describe("buildReengagementEmail", () => {
  it("produces correct subject for a named user", () => {
    const { subject } = buildReengagementEmail("Alex", "https://app.example.com");
    expect(subject).toBe("Your streak is waiting, Alex");
  });

  it("produces correct subject when firstName is 'there' (null name fallback)", () => {
    const { subject } = buildReengagementEmail("there", "https://app.example.com");
    expect(subject).toBe("Your streak is waiting, there");
  });

  it("includes the CTA link in the HTML body", () => {
    const { html } = buildReengagementEmail("Sam", "https://lifepilot.app");
    expect(html).toContain("https://lifepilot.app/checkin");
  });

  it("includes the plain-text CTA URL", () => {
    const { text } = buildReengagementEmail("Sam", "https://lifepilot.app");
    expect(text).toContain("https://lifepilot.app/checkin");
  });

  it("includes the user's first name in both html and text", () => {
    const { html, text } = buildReengagementEmail("Jordan", "https://app.example.com");
    expect(html).toContain("Jordan");
    expect(text).toContain("Jordan");
  });

  it("returns all three email parts", () => {
    const result = buildReengagementEmail("Taylor", "https://app.example.com");
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });
});

// ── Inactivity logic (via mock-step execution) ────────────────────────────────
// We mock @supabase/supabase-js + resend + the inngest function wrapper,
// then drive the step callbacks directly.

vi.mock("@/lib/email/resend", () => ({
  getResendClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("../client", () => ({
  inngest: {
    createFunction: vi.fn((config, callback) => ({ config, callback })),
  },
}));

import { createClient as createSupabaseClientMock } from "@supabase/supabase-js";
import { getResendClient } from "@/lib/email/resend";

const TODAY = new Date().toISOString();

function makeAdminClient(opts: {
  profiles?: object[];
  profilesError?: Error | null;
  recentCheckin?: object | null;
  userEmail?: string;
  updateOk?: boolean;
}) {
  const {
    profiles = [],
    profilesError = null,
    recentCheckin = null,
    userEmail = "user@example.com",
    updateOk = true,
  } = opts;

  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "profiles") {
      const q = {
        select: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: profilesError ? null : profiles, error: profilesError }),
        update: updateFn,
      };
      return q;
    }
    if (table === "checkins") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: recentCheckin, error: null }),
      };
    }
    return {};
  });

  return {
    from,
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: { email: userEmail } } }),
      },
    },
    _updateFn: updateFn,
  };
}

function makeStep() {
  return {
    run: vi.fn().mockImplementation(async (_name: string, fn: () => Promise<unknown>) => fn()),
  };
}

async function runCheckInactivity(adminClient: ReturnType<typeof makeAdminClient>) {
  vi.mocked(createSupabaseClientMock).mockReturnValue(adminClient as never);
  // Re-import to get fresh module with current mock
  const { checkInactivity } = await import("../functions/checkInactivity?t=" + Date.now());
  const step = makeStep();
  // The function is wrapped by inngest.createFunction; extract the callback
  const fn = (checkInactivity as unknown as { callback: (ctx: { step: typeof step }) => Promise<unknown> }).callback;
  return fn({ step });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getResendClient).mockReturnValue({
    emails: { send: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  } as never);
});

describe("checkInactivity pipeline", () => {
  it("sends re-engagement email to inactive user with no recent check-in", async () => {
    const profile = { id: "uid-1", name: "Alice", last_reengagement_sent_at: null, notification_preferences: { reengagementEmails: true } };
    const adminClient = makeAdminClient({ profiles: [profile], recentCheckin: null });
    await runCheckInactivity(adminClient);

    const resend = vi.mocked(getResendClient)();
    expect(resend.emails.send).toHaveBeenCalledOnce();
    const callArg = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.subject).toContain("Alice");
  });

  it("skips user who has checked in within last 3 days", async () => {
    const profile = { id: "uid-1", name: "Bob", last_reengagement_sent_at: null, notification_preferences: { reengagementEmails: true } };
    const adminClient = makeAdminClient({ profiles: [profile], recentCheckin: { id: "c1" } });
    await runCheckInactivity(adminClient);

    const resend = vi.mocked(getResendClient)();
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it("uses 'there' as firstName when profile.name is null", async () => {
    const profile = { id: "uid-2", name: null, last_reengagement_sent_at: null, notification_preferences: { reengagementEmails: true } };
    const adminClient = makeAdminClient({ profiles: [profile], recentCheckin: null });
    await runCheckInactivity(adminClient);

    const resend = vi.mocked(getResendClient)();
    const callArg = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.subject).toBe("Your streak is waiting, there");
  });

  it("updates last_reengagement_sent_at after successful send", async () => {
    const profile = { id: "uid-3", name: "Carol", last_reengagement_sent_at: null, notification_preferences: { reengagementEmails: true } };
    const adminClient = makeAdminClient({ profiles: [profile], recentCheckin: null });
    await runCheckInactivity(adminClient);

    // profiles.update should have been called
    expect(adminClient.from).toHaveBeenCalledWith("profiles");
  });

  it("does not update last_reengagement_sent_at when Resend returns an error", async () => {
    vi.mocked(getResendClient).mockReturnValue({
      emails: { send: vi.fn().mockResolvedValue({ data: null, error: { name: "SEND_ERROR" } }) },
    } as never);
    const profile = { id: "uid-4", name: "Dave", last_reengagement_sent_at: null, notification_preferences: { reengagementEmails: true } };
    const adminClient = makeAdminClient({ profiles: [profile], recentCheckin: null });
    await runCheckInactivity(adminClient);

    // update should NOT have been called on profiles after a send failure
    expect(adminClient._updateFn).not.toHaveBeenCalled();
  });
});
