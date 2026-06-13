import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
    auth: {
      admin: { getUserById: mockAdminGetUserById },
    },
  })),
}));

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const TARGET_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function makeRequest(userId?: string | null): Request {
  const url =
    userId != null
      ? `http://localhost/api/admin/users?userId=${userId}`
      : `http://localhost/api/admin/users`;
  return new Request(url);
}

async function getHandler() {
  vi.resetModules();
  const mod = await import("../users/route");
  return mod.GET;
}

// Call sequence per request (after P5 patch):
// 1. supabase.auth.getUser() — session auth
// 2. AdminUserLookupSchema.safeParse() — no DB (UUID validation, P5)
// 3. adminClient.from("profiles") idx 1 — role check (.select("role").eq().single())
// 4. adminClient.auth.admin.getUserById() — user existence check (P4)
// 5. Promise.all: from("briefings") idx 2, from("reengagement_notifications") idx 3, from("profiles") idx 4
// 6. from("audit_logs") idx 5 — fire-and-forget

function setupDefaultMocks(overrides: {
  role?: string | null;
  roleError?: object | null;
  targetUser?: object | null;
  getUserByIdError?: object | null;
  briefings?: object[];
  briefingsError?: object | null;
  reengagements?: object[];
  reengagementsError?: object | null;
  profileData?: object | null;
  profileError?: object | null;
} = {}) {
  const role = overrides.role !== undefined ? overrides.role : "admin";
  const roleError = overrides.roleError ?? null;
  const targetUser = overrides.targetUser !== undefined
    ? overrides.targetUser
    : { id: TARGET_UUID, email_confirmed_at: "2024-01-01T00:00:00Z" };
  const getUserByIdError = overrides.getUserByIdError ?? null;
  const briefings = overrides.briefings ?? [{ briefing_date: "2024-01-01", email_status: "delivered" }];
  const briefingsError = overrides.briefingsError ?? null;
  const reengagements = overrides.reengagements ?? [];
  const reengagementsError = overrides.reengagementsError ?? null;
  const profileData = overrides.profileData !== undefined ? overrides.profileData : { id: TARGET_UUID };
  const profileError = overrides.profileError ?? null;

  mockAdminGetUserById.mockResolvedValue({
    data: { user: targetUser },
    error: getUserByIdError,
  });

  let callIndex = 0;
  mockAdminFrom.mockImplementation(() => {
    callIndex++;
    const idx = callIndex;

    if (idx === 1) {
      // Role check: .select("role").eq().single()
      const single = vi.fn().mockResolvedValue({
        data: role ? { role } : null,
        error: roleError,
      });
      const eq = vi.fn().mockReturnValue({ single });
      return { select: vi.fn().mockReturnValue({ eq }) };
    }

    if (idx === 2) {
      // briefings: .select().eq().order().limit()
      const limit = vi.fn().mockResolvedValue({ data: briefings, error: briefingsError });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      return { select: vi.fn().mockReturnValue({ eq }) };
    }

    if (idx === 3) {
      // reengagement_notifications: .select().eq().order().limit()
      const limit = vi.fn().mockResolvedValue({ data: reengagements, error: reengagementsError });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      return { select: vi.fn().mockReturnValue({ eq }) };
    }

    if (idx === 4) {
      // profiles (second): .select().eq().maybeSingle()
      const maybeSingle = vi.fn().mockResolvedValue({ data: profileData, error: profileError });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      return { select: vi.fn().mockReturnValue({ eq }) };
    }

    if (idx === 5) {
      // audit_logs: .insert().then()
      const thenFn = vi.fn().mockReturnValue({ catch: vi.fn() });
      const insert = vi.fn().mockReturnValue({ then: thenFn });
      return { insert };
    }

    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    mockGetUser.mockResolvedValue({
      data: { user: { id: VALID_UUID } },
      error: null,
    });
    setupDefaultMocks();
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("CONFIG_ERROR");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 VALIDATION_ERROR for non-UUID userId without hitting DB (P5)", async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest("not-a-uuid"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    // P5: UUID validated before role check — adminFrom must not be called
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when userId is missing without hitting DB (P5)", async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 500 DB_ERROR when role check query fails", async () => {
    setupDefaultMocks({ roleError: { message: "connection error", code: "PGRST" } });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("DB_ERROR");
  });

  it("returns 403 FORBIDDEN when user is not admin", async () => {
    setupDefaultMocks({ role: "user" });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 502 AUTH_ERROR when getUserById returns an error (P4)", async () => {
    setupDefaultMocks({ getUserByIdError: { message: "Auth service unavailable" } });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_ERROR");
  });

  it("returns 404 NOT_FOUND when getUserById returns null user", async () => {
    setupDefaultMocks({ targetUser: null });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 500 DB_ERROR when briefings query fails (P1)", async () => {
    setupDefaultMocks({ briefingsError: { message: "briefings table error" } });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("DB_ERROR");
  });

  it("returns 500 DB_ERROR when reengagement_notifications query fails (P1)", async () => {
    setupDefaultMocks({ reengagementsError: { message: "reengagement table error" } });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("DB_ERROR");
  });

  it("returns 500 DB_ERROR when profile query fails (P1)", async () => {
    setupDefaultMocks({ profileError: { message: "profiles table error" } });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("DB_ERROR");
  });

  it("returns 200 with correct data shape for admin", async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty("accountStatus");
    expect(body.data).toHaveProperty("briefings");
    expect(body.data).toHaveProperty("reengagementNotifications");
    expect(body.data).toHaveProperty("profileComplete");
  });

  it("returns accountStatus verified when email_confirmed_at is set", async () => {
    setupDefaultMocks({ targetUser: { id: TARGET_UUID, email_confirmed_at: "2024-01-01T00:00:00Z" } });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    const body = await res.json();
    expect(body.data.accountStatus).toBe("verified");
  });

  it("returns accountStatus unverified when email_confirmed_at is null", async () => {
    setupDefaultMocks({ targetUser: { id: TARGET_UUID, email_confirmed_at: null } });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    const body = await res.json();
    expect(body.data.accountStatus).toBe("unverified");
  });

  it("returns profileComplete true when profile row exists", async () => {
    setupDefaultMocks({ profileData: { id: TARGET_UUID } });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    const body = await res.json();
    expect(body.data.profileComplete).toBe(true);
  });

  it("returns profileComplete false when profile row is null", async () => {
    setupDefaultMocks({ profileData: null });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    const body = await res.json();
    expect(body.data.profileComplete).toBe(false);
  });

  it("includes briefings array in response", async () => {
    const briefings = [
      { briefing_date: "2024-01-15", email_status: "delivered" },
      { briefing_date: "2024-01-14", email_status: "failed" },
    ];
    setupDefaultMocks({ briefings });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    const body = await res.json();
    expect(body.data.briefings).toEqual(briefings);
  });

  it("includes reengagementNotifications array in response", async () => {
    const reengagements = [{ sent_at: "2024-01-10T12:00:00Z", email_status: "delivered" }];
    setupDefaultMocks({ reengagements });
    const GET = await getHandler();
    const res = await GET(makeRequest(TARGET_UUID));
    const body = await res.json();
    expect(body.data.reengagementNotifications).toEqual(reengagements);
  });
});
