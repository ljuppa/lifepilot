import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

const mockAdminFrom = vi.fn();
const mockAdminRpc = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
  })),
}));

const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

async function getHandler() {
  vi.resetModules();
  const mod = await import("../metrics/route");
  return mod.GET;
}

describe("GET /api/admin/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    mockConsoleLog.mockImplementation(() => {});
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-user-id" } },
      error: null,
    });
    setupDefaultMocks();
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  // Call sequence per request:
  // route.ts: from() call 1 — profiles role check (.select("role").eq().single())
  // getMetrics.ts: rpc("get_dau", ...) — DAU via COUNT(DISTINCT)
  // getMetrics.ts: from() call 2 — profiles total users (.select("*", {count,head}))
  // getMetrics.ts: from() call 3 — briefings total today (.select(...).eq())
  // getMetrics.ts: from() call 4 — briefings delivered (.select(...).eq().eq())
  function setupDefaultMocks(overrides: {
    role?: string | null;
    dau?: number;
    totalUsers?: number;
    totalBriefings?: number;
    deliveredBriefings?: number;
  } = {}) {
    const role = overrides.role !== undefined ? overrides.role : "admin";
    const dau = overrides.dau ?? 2;
    const totalUsers = overrides.totalUsers ?? 10;
    const totalBriefings = overrides.totalBriefings ?? 5;
    const deliveredBriefings = overrides.deliveredBriefings ?? 4;

    // RPC mock for DAU
    mockAdminRpc.mockResolvedValue({ data: dau, error: null });

    let callIndex = 0;
    mockAdminFrom.mockImplementation(() => {
      callIndex++;
      const idx = callIndex;

      if (idx === 1) {
        // profiles role check: .select("role").eq(id, userId).single()
        const single = vi.fn().mockResolvedValue({
          data: role ? { role } : null,
          error: null,
        });
        const eq = vi.fn().mockReturnValue({ single });
        return { select: vi.fn().mockReturnValue({ eq }) };
      }

      if (idx === 2) {
        // profiles total: .select("*", {count,head}) → Promise directly
        return { select: vi.fn().mockResolvedValue({ count: totalUsers, error: null }) };
      }

      if (idx === 3) {
        // briefings total today: .select(...).eq("briefing_date", ...) → Promise
        const eq = vi.fn().mockResolvedValue({ count: totalBriefings, error: null });
        return { select: vi.fn().mockReturnValue({ eq }) };
      }

      if (idx === 4) {
        // briefings delivered: .select(...).eq("briefing_date", ...).eq("email_status", ...) → Promise
        const eq2 = vi.fn().mockResolvedValue({ count: deliveredBriefings, error: null });
        const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
        return { select: vi.fn().mockReturnValue({ eq: eq1 }) };
      }

      return { select: vi.fn().mockResolvedValue({ count: 0, error: null }) };
    });
  }

  it("returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("CONFIG_ERROR");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") });
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when user role is not admin", async () => {
    setupDefaultMocks({ role: "user" });
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 200 with correct data shape for admin", async () => {
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty("dau");
    expect(body.data).toHaveProperty("briefingDeliveryRate");
    expect(body.data).toHaveProperty("checkinRate");
    expect(body.data).toHaveProperty("totalUsers");
  });

  it("uses COUNT(DISTINCT) RPC result for DAU", async () => {
    setupDefaultMocks({ dau: 7 });
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();
    expect(body.data.dau).toBe(7);
  });

  it("returns 500 when a metrics query fails", async () => {
    mockAdminRpc.mockResolvedValue({ data: null, error: { message: "DB connection failed", code: "500" } });
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("DB_ERROR");
  });

  it("returns briefingDeliveryRate as integer percentage (4 of 5 = 80%)", async () => {
    setupDefaultMocks({ totalBriefings: 5, deliveredBriefings: 4 });
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();
    expect(body.data.briefingDeliveryRate).toBe(80);
  });

  it("returns briefingDeliveryRate of 0 when no briefings today", async () => {
    setupDefaultMocks({ totalBriefings: 0, deliveredBriefings: 0 });
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();
    expect(body.data.briefingDeliveryRate).toBe(0);
  });

  it("returns checkinRate of 0 when totalUsers is 0", async () => {
    setupDefaultMocks({ totalUsers: 0, dau: 0 });
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();
    expect(body.data.checkinRate).toBe(0);
  });

  it("returns correct checkinRate as integer percentage (2 DAU of 10 = 20%)", async () => {
    setupDefaultMocks({ dau: 2, totalUsers: 10 });
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();
    expect(body.data.checkinRate).toBe(20);
  });

  it("returns correct totalUsers count", async () => {
    setupDefaultMocks({ totalUsers: 42 });
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();
    expect(body.data.totalUsers).toBe(42);
  });

  it("emits structured log with event admin_metrics_fetched and no PII", async () => {
    const GET = await getHandler();
    await GET();
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("admin_metrics_fetched")
    );
    const logArg = mockConsoleLog.mock.calls[0][0];
    const parsed = JSON.parse(logArg);
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("email");
  });

  it("clamps briefingDeliveryRate to 100% on data inconsistency", async () => {
    setupDefaultMocks({ totalBriefings: 5, deliveredBriefings: 6 });
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();
    expect(body.data.briefingDeliveryRate).toBe(100);
  });
});
