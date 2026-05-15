import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/utils/supabase/server";
import { GET, PATCH } from "@/app/api/notifications/route";

const EXISTING_PREFS = { briefingEmails: true, reengagementEmails: true };

function makeSingle(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  };
}

function mockUnauth() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("no session") }) },
    from: vi.fn(),
  };
}

function mockAuth(fromFactory?: () => ReturnType<typeof makeSingle>) {
  let callCount = 0;
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null }) },
    from: vi.fn().mockImplementation(() => {
      callCount++;
      return fromFactory ? fromFactory() : makeSingle({ data: { notification_preferences: EXISTING_PREFS }, error: null });
    }),
  };
}

function patchReq(body: object) {
  return new NextRequest("http://localhost/api/notifications", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => vi.clearAllMocks());

// ── GET /api/notifications ────────────────────────────────────────────────────

describe("GET /api/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockUnauth() as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("returns notification_preferences on success", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(() =>
        makeSingle({ data: { notification_preferences: EXISTING_PREFS }, error: null })
      ) as never
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.notification_preferences).toEqual(EXISTING_PREFS);
  });

  it("returns 500 on DB error", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(() => makeSingle({ data: null, error: { message: "db fail" } })) as never
    );
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── PATCH /api/notifications ──────────────────────────────────────────────────

describe("PATCH /api/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockUnauth() as never);
    const res = await PATCH(patchReq({ briefingEmails: false }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("returns 422 when body is empty object", async () => {
    vi.mocked(createClient).mockResolvedValue(mockAuth() as never);
    const res = await PATCH(patchReq({}));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when value is non-boolean", async () => {
    vi.mocked(createClient).mockResolvedValue(mockAuth() as never);
    const res = await PATCH(patchReq({ briefingEmails: "yes" }));
    expect(res.status).toBe(422);
  });

  it("merges updates without clobbering other key", async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null }) },
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { notification_preferences: EXISTING_PREFS },
            error: null,
          }),
        })
        .mockReturnValueOnce({ update: updateFn }),
    } as never);

    const res = await PATCH(patchReq({ briefingEmails: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.notification_preferences.briefingEmails).toBe(false);
    expect(body.data.notification_preferences.reengagementEmails).toBe(true);
  });

  it("partial update — only reengagementEmails — merges without clobbering briefingEmails", async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null }) },
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { notification_preferences: EXISTING_PREFS },
            error: null,
          }),
        })
        .mockReturnValueOnce({ update: updateFn }),
    } as never);

    const res = await PATCH(patchReq({ reengagementEmails: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.notification_preferences.reengagementEmails).toBe(false);
    expect(body.data.notification_preferences.briefingEmails).toBe(true);
  });

  it("returns 500 when DB update fails", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null }) },
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { notification_preferences: EXISTING_PREFS },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: "db write fail" } }),
          }),
        }),
    } as never);

    const res = await PATCH(patchReq({ briefingEmails: false }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});
