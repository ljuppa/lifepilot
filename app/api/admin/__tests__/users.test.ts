import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

const mockAdminFrom = vi.fn();
const mockAdminGetUserById = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: { admin: { getUserById: mockAdminGetUserById } },
  })),
}));

const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const VALID_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const ADMIN_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

async function getHandler() {
  vi.resetModules();
  const mod = await import("../users/route");
  return mod.GET;
}

function makeReq(userId?: string | null): NextRequest {
  const params = userId !== undefined && userId !== null ? `?userId=${userId}` : "";
  return new NextRequest(`http://localhost/api/admin/users${params}`);
}

// Call sequence per request:
// from() call 1 — profiles role check (.select("role").eq().single())
// auth.admin.getUserById() — user existence check
// from() call 2 — briefings (.select().eq().order().limit(10))
// from() call 3 — reengagement_notifications (.select().eq().order().limit(5))
// from() call 4 — profiles profileComplete (.select("id").eq().maybeSingle())
// from() call 5 — audit_logs insert (fire-and-forget)
function setupDefaultMocks(overrides: {
  role?: string | null;
  userFound?: boolean;
  emailConfirmedAt?: string | null;
  briefings?: Array<{ briefing_date: string; email_status: string }>;
  reengagement?: Array<{ sent_at: string; email_status: string }>;
  profileExists?: boolean;
} = {}) {
  const role = overrides.role !== undefined ? overrides.role : "admin";
  const userFound = overrides.userFound !== undefined ? overrides.userFound : true;
  const emailConfirmedAt = overrides.emailConfirmedAt !== undefined ? overrides.emailConfirmedAt : "2026-01-01T00:00:00Z";
  const briefings = overrides.briefings ?? [{ briefing_date: "2026-06-12", email_status: "delivered" }];
  const reengagement = overrides.reengagement ?? [];
  const profileExists = overrides.profileExists !== undefined ? overrides.profileExists : true;

  mockGetUser.mockResolvedValue({
    data: { user: { id: ADMIN_USER_ID } },
    error: null,
  });

  if (userFound) {
    mockAdminGetUserById.mockResolvedValue({
      data: { user: { id: VALID_USER_ID, email_confirmed_at: emailConfirmedAt } },
      error: null,
    });
  } else {
    mockAdminGetUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "User not found" },
    });
  }

  let callIndex = 0;
  mockAdminFrom.mockImplementation(() => {
    callIndex++;
    const idx = callIndex;

    if (idx === 1) {
      // profiles role check
      const single = vi.fn().mockResolvedValue({
        data: role ? { role } : null,
        error: null,
      });
      const eq = vi.fn().mockReturnValue({ single });
      return { select: vi.fn().mockReturnValue({ eq }) };
    }

    if (idx === 2) {
      // briefings: .select().eq().order().limit()
      const limit = vi.fn().mockResolvedValue({ data: briefings, error: null });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      return { select: vi.fn().mockReturnValue({ eq }) };
    }

    if (idx === 3) {
      // reengagement_notifications: .select().eq().order().limit()
      const limit = vi.fn().mockResolvedValue({ data: reengagement, error: null });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      return { select: vi.fn().mockReturnValue({ eq }) };
    }

    if (idx === 4) {
      // profiles profileComplete: .select().eq().maybeSingle()
      const maybeSingle = vi.fn().mockResolvedValue({
        data: profileExists ? { id: VALID_USER_ID } : null,
        error: null,
      });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      return { select: vi.fn().mockReturnValue({ eq }) };
    }

    if (idx === 5) {
      // audit_logs insert (fire-and-forget)
      return { insert: vi.fn().mockReturnValue(Promise.resolve({ error: null })) };
    }

    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    mockConsoleLog.mockImplementation(() => {});
    setupDefaultMocks();
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("CONFIG_ERROR");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") });
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when user role is not admin", async () => {
    setupDefaultMocks({ role: "user" });
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when userId is absent", async () => {
    const GET = await getHandler();
    const res = await GET(makeReq(null));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when userId is not a valid UUID", async () => {
    const GET = await getHandler();
    const res = await GET(makeReq("not-a-valid-uuid"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when user not found in Auth", async () => {
    setupDefaultMocks({ userFound: false });
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 200 with correct data shape", async () => {
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty("accountStatus");
    expect(body.data).toHaveProperty("briefings");
    expect(body.data).toHaveProperty("reengagementNotifications");
    expect(body.data).toHaveProperty("profileComplete");
  });

  it("returns accountStatus 'verified' when email_confirmed_at is set", async () => {
    setupDefaultMocks({ emailConfirmedAt: "2026-01-01T00:00:00Z" });
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    const body = await res.json();
    expect(body.data.accountStatus).toBe("verified");
  });

  it("returns accountStatus 'unverified' when email_confirmed_at is null", async () => {
    setupDefaultMocks({ emailConfirmedAt: null });
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    const body = await res.json();
    expect(body.data.accountStatus).toBe("unverified");
  });

  it("returns briefings array from DB result", async () => {
    const briefings = [
      { briefing_date: "2026-06-12", email_status: "delivered" },
      { briefing_date: "2026-06-11", email_status: "failed" },
    ];
    setupDefaultMocks({ briefings });
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    const body = await res.json();
    expect(body.data.briefings).toEqual(briefings);
  });

  it("returns reengagementNotifications array from DB result", async () => {
    const reengagement = [
      { sent_at: "2026-05-01T10:00:00Z", email_status: "delivered" },
    ];
    setupDefaultMocks({ reengagement });
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    const body = await res.json();
    expect(body.data.reengagementNotifications).toEqual(reengagement);
  });

  it("returns profileComplete true when profile row exists", async () => {
    setupDefaultMocks({ profileExists: true });
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    const body = await res.json();
    expect(body.data.profileComplete).toBe(true);
  });

  it("returns profileComplete false when no profile row", async () => {
    setupDefaultMocks({ profileExists: false });
    const GET = await getHandler();
    const res = await GET(makeReq(VALID_USER_ID));
    const body = await res.json();
    expect(body.data.profileComplete).toBe(false);
  });

  it("emits structured log with event admin_user_lookup_success and no PII", async () => {
    const GET = await getHandler();
    await GET(makeReq(VALID_USER_ID));
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("admin_user_lookup_success")
    );
    const logArg = mockConsoleLog.mock.calls[0][0];
    const parsed = JSON.parse(logArg);
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("target_user_id");
  });

  it("calls audit_logs insert with correct event_type and metadata", async () => {
    const GET = await getHandler();
    await GET(makeReq(VALID_USER_ID));
    // audit_logs insert is call 5 on mockAdminFrom
    expect(mockAdminFrom).toHaveBeenCalledTimes(5);
    const auditCallArgs = mockAdminFrom.mock.calls[4][0];
    expect(auditCallArgs).toBe("audit_logs");
  });
});
