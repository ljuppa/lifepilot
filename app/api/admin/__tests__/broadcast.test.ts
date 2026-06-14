import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCheckRateLimit = vi.fn().mockResolvedValue({ ok: true, retryAfterSeconds: 0 });

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

const mockGetUser = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

const mockAdminFrom = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

const mockInngestSend = vi.fn();

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: mockInngestSend },
}));

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(body?: object): Request {
  return new Request("http://localhost/api/admin/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function getHandler() {
  vi.resetModules();
  const mod = await import("../broadcast/route");
  return mod.POST;
}

function setupDefaultMocks(overrides: { role?: string | null; roleError?: object | null } = {}) {
  const role = overrides.role !== undefined ? overrides.role : "admin";
  const roleError = overrides.roleError ?? null;

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
      // Audit log: .insert().then().catch()
      const catchFn = vi.fn();
      const thenFn = vi.fn().mockReturnValue({ catch: catchFn });
      const insert = vi.fn().mockReturnValue({ then: thenFn });
      return { insert };
    }

    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });

  mockInngestSend.mockResolvedValue(undefined);
}

describe("POST /api/admin/broadcast", () => {
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

  it("returns 429 when broadcast rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ ok: false, retryAfterSeconds: 300 });
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "Hello", body: "World" }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe("RATE_LIMITED");
    expect(res.headers.get("Retry-After")).toBe("300");
  });

  it("returns 403 when Origin header does not match host (CSRF)", async () => {
    const POST = await getHandler();
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example.com",
        Host: "localhost",
      },
      body: JSON.stringify({ subject: "Hello", body: "World" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("passes CSRF check when Origin matches host", async () => {
    const POST = await getHandler();
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost",
        Host: "localhost",
      },
      body: JSON.stringify({ subject: "Hello", body: "World" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "Hello", body: "World" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("CONFIG_ERROR");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") });
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "Hello", body: "World" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 VALIDATION_ERROR for missing subject without hitting DB (P5)", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ body: "World" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for missing body without hitting DB (P5)", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "Hello" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for empty subject without hitting DB (P5)", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "", body: "World" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for whitespace-only subject without hitting DB", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "   ", body: "World" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for subject over 120 chars without hitting DB (P5)", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "a".repeat(121), body: "World" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for body over 2000 chars without hitting DB (P5)", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "Hello", body: "a".repeat(2001) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for whitespace-only body without hitting DB", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "Hello", body: "   " }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for malformed JSON body without hitting DB", async () => {
    const POST = await getHandler();
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 500 DB_ERROR when role check query fails", async () => {
    setupDefaultMocks({ roleError: { message: "connection error", code: "PGRST" } });
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "Hello", body: "World" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("DB_ERROR");
  });

  it("returns 403 FORBIDDEN when user is not admin", async () => {
    setupDefaultMocks({ role: "user" });
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "Hello", body: "World" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("returns 200 with queued message on success", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ subject: "Hello", body: "World" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.message).toContain("queued");
    expect(mockInngestSend).toHaveBeenCalledTimes(1);
  });

  it("sends correct Inngest event with broadcast data", async () => {
    const POST = await getHandler();
    await POST(makeRequest({ subject: "Test subject", body: "Test body content" }));
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "notification/broadcast.requested",
        data: expect.objectContaining({
          adminUserId: VALID_UUID,
          subject: "Test subject",
          body: "Test body content",
        }),
      })
    );
  });

  it("includes triggeredAt ISO string in Inngest event", async () => {
    const POST = await getHandler();
    await POST(makeRequest({ subject: "Hello", body: "World" }));
    const call = mockInngestSend.mock.calls[0][0];
    expect(call.data.triggeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
