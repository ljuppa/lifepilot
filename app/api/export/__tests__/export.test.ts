import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfterSeconds: 0 }),
}));

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
const mockGetUser = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

async function getHandler() {
  const mod = await import("../route");
  return mod.POST;
}

describe("POST /api/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") });

    const POST = await getHandler();
    const res = await POST();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when getUser returns no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const POST = await getHandler();
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("emits Inngest event when authenticated", async () => {
    const { inngest } = await import("@/lib/inngest/client");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const POST = await getHandler();
    await POST();

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "export/data.requested",
        data: expect.objectContaining({ userId: "user-123", triggeredAt: expect.any(String) }),
      })
    );
  });

  it("inserts audit log row when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const POST = await getHandler();
    await POST();

    expect(mockFrom).toHaveBeenCalledWith("audit_logs");
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-123",
      event_type: "data_export_requested",
    });
  });

  it("returns the correct success message", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const POST = await getHandler();
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.message).toContain("email when it");
  });

  it("does not block response when audit log insert fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: { code: "23000", message: "db error" } });

    const POST = await getHandler();
    const res = await POST();
    expect(res.status).toBe(200);
  });
});
