import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockGetUser = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser, signOut: mockSignOut },
  }),
}));

const mockAdminDeleteUser = vi.fn().mockResolvedValue({ error: null });
const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({
  insert: mockInsert,
  delete: mockDelete,
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { deleteUser: mockAdminDeleteUser } },
  })),
}));

const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

async function getHandler() {
  vi.resetModules();
  const mod = await import("../route");
  return mod.DELETE;
}

describe("DELETE /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mockAdminDeleteUser.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockEq.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ insert: mockInsert, delete: mockDelete });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") });
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 500 when audit log write fails", async () => {
    mockInsert.mockResolvedValue({ error: { message: "DB failure" } });
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("DB_ERROR");
    // Should NOT proceed to delete user data
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });

  it("writes audit log with event_type account_deleted", async () => {
    const DELETE = await getHandler();
    await DELETE();
    expect(mockFrom).toHaveBeenCalledWith("audit_logs");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-123", event_type: "account_deleted" })
    );
  });

  it("deletes checkins for the user", async () => {
    const DELETE = await getHandler();
    await DELETE();
    expect(mockFrom).toHaveBeenCalledWith("checkins");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("deletes briefings for the user", async () => {
    const DELETE = await getHandler();
    await DELETE();
    expect(mockFrom).toHaveBeenCalledWith("briefings");
  });

  it("deletes goals for the user", async () => {
    const DELETE = await getHandler();
    await DELETE();
    expect(mockFrom).toHaveBeenCalledWith("goals");
  });

  it("deletes audit_logs for the user", async () => {
    const DELETE = await getHandler();
    await DELETE();
    const auditLogCalls = mockFrom.mock.calls.filter((c) => c[0] === "audit_logs");
    // Called twice: once for insert, then for delete
    expect(auditLogCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("calls auth.admin.deleteUser with userId", async () => {
    const DELETE = await getHandler();
    await DELETE();
    expect(mockAdminDeleteUser).toHaveBeenCalledWith("user-123");
  });

  it("calls signOut to invalidate session", async () => {
    const DELETE = await getHandler();
    await DELETE();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("emits structured log with event account_deleted and userId", async () => {
    const DELETE = await getHandler();
    await DELETE();
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("account_deleted")
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("user-123")
    );
    const logArg = mockConsoleLog.mock.calls[0][0];
    const parsed = JSON.parse(logArg);
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("name");
  });

  it("returns { data: { deleted: true } } on success", async () => {
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });
});
