import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildBroadcastEmail } from "../../email/templates/broadcast";

// ── buildBroadcastEmail (pure function) ───────────────────────────────────────

describe("buildBroadcastEmail", () => {
  it("returns the provided subject unchanged", () => {
    const { subject } = buildBroadcastEmail("Important update", "Hello users.");
    expect(subject).toBe("Important update");
  });

  it("includes body paragraph in html", () => {
    const { html } = buildBroadcastEmail("Subject", "Hello users.");
    expect(html).toContain("Hello users.");
  });

  it("includes body in plain text", () => {
    const { text } = buildBroadcastEmail("Subject", "Hello users.");
    expect(text).toContain("Hello users.");
  });

  it("splits multi-line body into separate paragraphs in html", () => {
    const { html } = buildBroadcastEmail("Subject", "Line one.\nLine two.");
    expect(html).toContain("Line one.");
    expect(html).toContain("Line two.");
  });

  it("includes unsubscribe link in html when provided (& escaped to &amp; in href)", () => {
    const url = "https://app.example.com/api/unsubscribe?token=abc&userId=123&type=broadcastEmails";
    const { html } = buildBroadcastEmail("Subject", "Body.", url);
    expect(html).toContain("token=abc&amp;userId=123&amp;type=broadcastEmails");
    expect(html).toContain("Unsubscribe");
  });

  it("includes unsubscribe link in text when provided", () => {
    const url = "https://app.example.com/api/unsubscribe?token=abc&userId=123&type=broadcastEmails";
    const { text } = buildBroadcastEmail("Subject", "Body.", url);
    expect(text).toContain(url);
  });

  it("omits unsubscribe section when url is not provided", () => {
    const { html } = buildBroadcastEmail("Subject", "Body.");
    expect(html).not.toContain("Unsubscribe");
  });

  it("includes company mailing address in html", () => {
    const { html } = buildBroadcastEmail("Subject", "Body.");
    expect(html).toContain("LifePilot");
  });

  it("returns all three email parts", () => {
    const result = buildBroadcastEmail("Subject", "Body.");
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });
});

// ── sendBroadcast Inngest function ────────────────────────────────────────────

vi.mock("@/lib/email/resend", () => ({
  getResendClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("../client", () => ({
  inngest: {
    createFunction: vi.fn((_config, _trigger, callback) => ({ _config, _trigger, callback })),
  },
}));

vi.mock("@/lib/email/unsubscribe", () => ({
  generateUnsubscribeToken: vi.fn().mockReturnValue("mock-token"),
}));

import { createClient as createSupabaseClientMock } from "@supabase/supabase-js";
import { getResendClient } from "@/lib/email/resend";

function makeStep() {
  return {
    run: vi.fn().mockImplementation(async (_name: string, fn: () => Promise<unknown>) => fn()),
  };
}

function makeAdminClient(opts: {
  profiles?: { id: string }[];
  profilesError?: Error | null;
  userEmail?: string;
  emailConfirmedAt?: string | null;
  getUserByIdError?: boolean;
  goalUserIds?: string[];
}) {
  const {
    profiles = [{ id: "uid-1" }],
    profilesError = null,
    userEmail = "user@example.com",
    emailConfirmedAt = "2024-01-01T00:00:00Z",
    getUserByIdError = false,
    goalUserIds,
  } = opts;

  // Default: all profiles have goals (so they pass the goals-existence filter)
  const effectiveGoalUserIds = goalUserIds ?? profiles.map((p) => p.id);

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "goals") {
      return {
        select: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: effectiveGoalUserIds.map((id: string) => ({ user_id: id })),
          error: null,
        }),
      };
    }
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: profilesError ? null : profiles, error: profilesError }),
      };
    }
    if (table === "audit_logs") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });

  return {
    from,
    auth: {
      admin: {
        getUserById: getUserByIdError
          ? vi.fn().mockRejectedValue(new Error("Auth service error"))
          : vi.fn().mockResolvedValue({
              data: { user: { email: userEmail, email_confirmed_at: emailConfirmedAt } },
            }),
      },
    },
  };
}

async function runSendBroadcast(
  adminClient: ReturnType<typeof makeAdminClient>,
  eventData: { adminUserId: string; subject: string; body: string; triggeredAt: string }
) {
  vi.mocked(createSupabaseClientMock).mockReturnValue(adminClient as never);
  const { sendBroadcast } = await import("../functions/sendBroadcast?t=" + Date.now());
  const step = makeStep();
  const fn = (sendBroadcast as unknown as { callback: (ctx: { event: { data: typeof eventData }; step: typeof step }) => Promise<unknown> }).callback;
  return fn({ event: { data: eventData }, step });
}

const defaultEvent = {
  adminUserId: "admin-uid-1",
  subject: "Important announcement",
  body: "We have an update for you.",
  triggeredAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  vi.mocked(getResendClient).mockReturnValue({
    emails: { send: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  } as never);
});

describe("sendBroadcast pipeline", () => {
  it("queries profiles filtered by broadcastEmails preference", async () => {
    const adminClient = makeAdminClient({});
    await runSendBroadcast(adminClient, defaultEvent);

    const profilesCalls = vi.mocked(adminClient.from).mock.calls.filter(([t]) => t === "profiles");
    expect(profilesCalls.length).toBeGreaterThan(0);
  });

  it("queries goals table to filter recipients with at least one goal", async () => {
    const adminClient = makeAdminClient({});
    await runSendBroadcast(adminClient, defaultEvent);

    const goalsCalls = vi.mocked(adminClient.from).mock.calls.filter(([t]) => t === "goals");
    expect(goalsCalls.length).toBeGreaterThan(0);
  });

  it("excludes profiles whose user has no goals", async () => {
    // profile uid-1 exists but is not in goalUserIds → filtered out
    const adminClient = makeAdminClient({ profiles: [{ id: "uid-1" }], goalUserIds: [] });
    await runSendBroadcast(adminClient, defaultEvent);

    const resend = vi.mocked(getResendClient)();
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it("sends email to confirmed recipient", async () => {
    const adminClient = makeAdminClient({ profiles: [{ id: "uid-1" }] });
    await runSendBroadcast(adminClient, defaultEvent);

    const resend = vi.mocked(getResendClient)();
    expect(resend.emails.send).toHaveBeenCalledOnce();
  });

  it("skips recipient with no email", async () => {
    const adminClient = makeAdminClient({ userEmail: "", emailConfirmedAt: "2024-01-01" });
    await runSendBroadcast(adminClient, defaultEvent);

    const resend = vi.mocked(getResendClient)();
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it("logs skip when recipient has no email", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const adminClient = makeAdminClient({ userEmail: "", emailConfirmedAt: "2024-01-01" });
    await runSendBroadcast(adminClient, defaultEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("broadcast_recipient_skipped")
    );
  });

  it("skips recipient whose email is not confirmed", async () => {
    const adminClient = makeAdminClient({ emailConfirmedAt: null });
    await runSendBroadcast(adminClient, defaultEvent);

    const resend = vi.mocked(getResendClient)();
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it("logs skip when recipient email is not confirmed", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const adminClient = makeAdminClient({ emailConfirmedAt: null });
    await runSendBroadcast(adminClient, defaultEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("broadcast_recipient_skipped")
    );
  });

  it("skips recipient when getUserById throws", async () => {
    const adminClient = makeAdminClient({ getUserByIdError: true });
    await runSendBroadcast(adminClient, defaultEvent);

    const resend = vi.mocked(getResendClient)();
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it("sends email with correct subject from event data", async () => {
    const adminClient = makeAdminClient({});
    await runSendBroadcast(adminClient, defaultEvent);

    const resend = vi.mocked(getResendClient)();
    const callArg = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.subject).toBe(defaultEvent.subject);
  });

  it("uses broadcastEmails type in unsubscribe URL", async () => {
    const adminClient = makeAdminClient({});
    await runSendBroadcast(adminClient, defaultEvent);

    const resend = vi.mocked(getResendClient)();
    const callArg = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.html).toContain("type=broadcastEmails");
  });

  it("returns recipientCount equal to number of opted-in profiles with goals", async () => {
    const adminClient = makeAdminClient({ profiles: [{ id: "uid-1" }, { id: "uid-2" }] });
    vi.mocked(createSupabaseClientMock).mockReturnValue(adminClient as never);

    const { sendBroadcast } = await import("../functions/sendBroadcast?t=" + Date.now());
    const step = makeStep();
    const fn = (sendBroadcast as unknown as { callback: (ctx: { event: { data: typeof defaultEvent }; step: typeof step }) => Promise<unknown> }).callback;
    const result = (await fn({ event: { data: defaultEvent }, step })) as { recipientCount: number };

    expect(result.recipientCount).toBe(2);
  });

  it("returns recipientCount 0 when no opted-in recipients", async () => {
    const adminClient = makeAdminClient({ profiles: [] });
    vi.mocked(createSupabaseClientMock).mockReturnValue(adminClient as never);

    const { sendBroadcast } = await import("../functions/sendBroadcast?t=" + Date.now());
    const step = makeStep();
    const fn = (sendBroadcast as unknown as { callback: (ctx: { event: { data: typeof defaultEvent }; step: typeof step }) => Promise<unknown> }).callback;
    const result = (await fn({ event: { data: defaultEvent }, step })) as { recipientCount: number };

    expect(result.recipientCount).toBe(0);
  });

  it("writes audit log inside a step.run for durability", async () => {
    const adminClient = makeAdminClient({});
    vi.mocked(createSupabaseClientMock).mockReturnValue(adminClient as never);

    const { sendBroadcast } = await import("../functions/sendBroadcast?t=" + Date.now());
    const step = makeStep();
    const fn = (sendBroadcast as unknown as { callback: (ctx: { event: { data: typeof defaultEvent }; step: typeof step }) => Promise<unknown> }).callback;
    await fn({ event: { data: defaultEvent }, step });

    const auditStepCall = step.run.mock.calls.find(([name]) => name === "write-audit-log");
    expect(auditStepCall).toBeDefined();
  });

  it("logs error when Resend send fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getResendClient).mockReturnValue({
      emails: { send: vi.fn().mockResolvedValue({ data: null, error: { name: "SEND_ERROR" } }) },
    } as never);
    const adminClient = makeAdminClient({});
    await runSendBroadcast(adminClient, defaultEvent);

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("throws when profiles DB query fails", async () => {
    const adminClient = makeAdminClient({ profilesError: new Error("DB error") });
    await expect(runSendBroadcast(adminClient, defaultEvent)).rejects.toThrow("Profiles fetch failed");
  });
});
