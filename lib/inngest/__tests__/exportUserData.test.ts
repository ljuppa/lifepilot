import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUpload = vi.fn().mockResolvedValue({ error: null });
const mockCreateSignedUrl = vi.fn().mockResolvedValue({
  data: { signedUrl: "https://signed.url/file.json" },
  error: null,
});
const mockStorageFrom = vi.fn().mockReturnValue({
  upload: mockUpload,
  createSignedUrl: mockCreateSignedUrl,
});

const mockGetUserById = vi.fn().mockResolvedValue({
  data: { user: { email: "user@example.com", user_metadata: { name: "Alice" } } },
});

const mockProfileQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: "user-123", full_name: "Alice" }, error: null }),
};

// Each list query now chains: .select().eq().order().limit() (or .eq().limit() for goals)
const mockListQuery = (data: unknown[]) => {
  const resolved = { data, error: null };
  const limitMock = vi.fn().mockResolvedValue(resolved);
  const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
  const eqMock = vi.fn().mockReturnValue({ order: orderMock, limit: limitMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  return { select: selectMock, eq: eqMock, order: orderMock, limit: limitMock };
};

const mockGoalsQuery = mockListQuery([{ id: "g1", title: "Run daily" }]);
const mockCheckinsQuery = mockListQuery([{ id: "c1", mood: 4 }]);
const mockBriefingsQuery = mockListQuery([{ id: "b1", summary: "Good day" }]);
const mockAuditQuery = mockListQuery([{ id: "a1", event_type: "login" }]);

const mockFrom = vi.fn((table: string) => {
  if (table === "profiles") return mockProfileQuery;
  if (table === "goals") return mockGoalsQuery;
  if (table === "checkins") return mockCheckinsQuery;
  if (table === "briefings") return mockBriefingsQuery;
  if (table === "audit_logs") return mockAuditQuery;
  return mockProfileQuery;
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));

const mockEmailSend = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/email/resend", () => ({
  getResendClient: vi.fn(() => ({ emails: { send: mockEmailSend } })),
}));

vi.mock("../client", () => ({
  inngest: {
    createFunction: vi.fn((_config: unknown, fn: unknown) => fn),
  },
}));

vi.mock("@/lib/email/templates/dataExport", () => ({
  buildDataExportEmail: vi.fn(() => ({
    subject: "Your LifePilot data export is ready",
    html: "<html>Download your data</html>",
    text: "Download your data: https://signed.url/file.json",
  })),
}));

async function runExportFunction(userId = "user-123") {
  const mod = await import("../functions/exportUserData");
  const fn = mod.exportUserData as unknown as (ctx: {
    event: { data: { userId: string } };
    step: {
      run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
    };
  }) => Promise<unknown>;

  const results: Record<string, unknown> = {};
  const step = {
    run: async (name: string, fn: () => Promise<unknown>) => {
      const result = await fn();
      results[name] = result;
      return result;
    },
  };

  const result = await fn({ event: { data: { userId } }, step });
  return { result, results };
}

describe("exportUserData Inngest function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.url/file.json" },
      error: null,
    });
    mockGetUserById.mockResolvedValue({
      data: { user: { email: "user@example.com", user_metadata: { name: "Alice" } } },
    });
    mockEmailSend.mockResolvedValue({ error: null });

    mockProfileQuery.single.mockResolvedValue({
      data: { id: "user-123", full_name: "Alice" },
      error: null,
    });
    vi.mocked(mockGoalsQuery.limit).mockResolvedValue({ data: [{ id: "g1" }], error: null });
    vi.mocked(mockCheckinsQuery.limit).mockResolvedValue({ data: [{ id: "c1" }], error: null });
    vi.mocked(mockBriefingsQuery.limit).mockResolvedValue({ data: [{ id: "b1" }], error: null });
    vi.mocked(mockAuditQuery.limit).mockResolvedValue({ data: [{ id: "a1" }], error: null });
  });

  it("fetches all 5 data types and assembles the payload", async () => {
    const { results } = await runExportFunction();
    const fetchResult = results["fetch-user-data"] as { jsonString: string };
    const payload = JSON.parse(fetchResult.jsonString);

    expect(payload).toHaveProperty("exportedAt");
    expect(payload).toHaveProperty("profile");
    expect(payload).toHaveProperty("goals");
    expect(payload).toHaveProperty("checkins");
    expect(payload).toHaveProperty("briefings");
    expect(payload).toHaveProperty("auditLog");
  });

  it("uploads to the correct path format", async () => {
    await runExportFunction("user-abc");
    expect(mockStorageFrom).toHaveBeenCalledWith("exports");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^exports\/user-abc\/.+\.json$/),
      expect.any(Buffer),
      { contentType: "application/json", upsert: true }
    );
  });

  it("generates a signed URL with 1-hour expiry", async () => {
    await runExportFunction();
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^exports\/user-123\/.+\.json$/),
      3600
    );
  });

  it("sends email with the signed download URL", async () => {
    const { buildDataExportEmail } = await import("@/lib/email/templates/dataExport");
    await runExportFunction();
    expect(buildDataExportEmail).toHaveBeenCalledWith(
      expect.objectContaining({ downloadUrl: "https://signed.url/file.json" })
    );
    expect(mockEmailSend).toHaveBeenCalled();
  });

  it("logs structured event on success", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runExportFunction();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("data_export_generated")
    );
    consoleSpy.mockRestore();
  });

  it("does not throw when email send fails — export is still complete", async () => {
    mockEmailSend.mockResolvedValue({ error: { name: "SEND_FAILED" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(runExportFunction()).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("data_export_email_failed")
    );
    consoleSpy.mockRestore();
  });

  it("does not throw when user email is not found", async () => {
    mockGetUserById.mockResolvedValue({ data: { user: null } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(runExportFunction()).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("NO_EMAIL"));
    consoleSpy.mockRestore();
  });

  it("throws when storage upload fails", async () => {
    mockUpload.mockResolvedValue({ error: { message: "bucket not found" } });

    await expect(runExportFunction()).rejects.toThrow("Storage upload failed");
  });
});
