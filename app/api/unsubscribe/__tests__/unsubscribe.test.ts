import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/email/unsubscribe", () => ({
  verifyUnsubscribeToken: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/unsubscribe/route";

const EXISTING_PREFS = { briefingEmails: true, reengagementEmails: true };

function makeAdminClient(prefs = EXISTING_PREFS) {
  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { notification_preferences: prefs }, error: null }),
      update: updateFn,
    }),
    _updateFn: updateFn,
  };
}

function makeUrl(params: Record<string, string | undefined>) {
  const url = new URL("http://localhost/api/unsubscribe");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  return url.toString();
}

function makeReq(params: Record<string, string | undefined>) {
  return new NextRequest(makeUrl(params));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyUnsubscribeToken).mockReturnValue(true);
  vi.mocked(createSupabaseClient).mockReturnValue(makeAdminClient() as never);
});

describe("GET /api/unsubscribe", () => {
  it("returns 200 HTML with success message for valid request", async () => {
    const res = await GET(
      makeReq({ token: "abc", userId: "uid-1", type: "briefingEmails" })
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("You have been unsubscribed.");
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });

  it("returns 400 HTML for invalid token", async () => {
    vi.mocked(verifyUnsubscribeToken).mockReturnValue(false);
    const res = await GET(
      makeReq({ token: "bad", userId: "uid-1", type: "briefingEmails" })
    );
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("Invalid unsubscribe link.");
  });

  it("returns 400 HTML for invalid type", async () => {
    const res = await GET(
      makeReq({ token: "abc", userId: "uid-1", type: "unknownType" })
    );
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("Invalid unsubscribe link.");
  });

  it("returns 400 HTML when params are missing", async () => {
    const res = await GET(makeReq({ userId: "uid-1", type: "briefingEmails" })); // missing token
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("Invalid unsubscribe link.");
  });

  it("sets correct preference key to false", async () => {
    const adminClient = makeAdminClient({ briefingEmails: true, reengagementEmails: true });
    vi.mocked(createSupabaseClient).mockReturnValue(adminClient as never);

    await GET(makeReq({ token: "abc", userId: "uid-1", type: "briefingEmails" }));

    expect(adminClient.from).toHaveBeenCalledWith("profiles");
    const updateCall = adminClient._updateFn.mock.calls[0][0];
    expect(updateCall.notification_preferences.briefingEmails).toBe(false);
  });

  it("does not affect other preference key when unsubscribing from one type", async () => {
    const adminClient = makeAdminClient({ briefingEmails: true, reengagementEmails: true });
    vi.mocked(createSupabaseClient).mockReturnValue(adminClient as never);

    await GET(makeReq({ token: "abc", userId: "uid-1", type: "reengagementEmails" }));

    const updateCall = adminClient._updateFn.mock.calls[0][0];
    expect(updateCall.notification_preferences.reengagementEmails).toBe(false);
    expect(updateCall.notification_preferences.briefingEmails).toBe(true);
  });
});
