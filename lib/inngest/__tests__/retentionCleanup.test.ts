import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Each delete query chains: .delete().lt(col, cutoff).select("id") → { data, error }
const makeDeleteQuery = (rows: unknown[]) => {
  const select = vi.fn().mockResolvedValue({ data: rows, error: null });
  const lt = vi.fn().mockReturnValue({ select });
  const del = vi.fn().mockReturnValue({ lt });
  return { delete: del, lt, select };
};

const mockCheckinsQuery = makeDeleteQuery([{ id: "c1" }, { id: "c2" }, { id: "c3" }]);
const mockBriefingsQuery = makeDeleteQuery([{ id: "b1" }, { id: "b2" }]);

const mockFrom = vi.fn((table: string) => {
  if (table === "checkins") return mockCheckinsQuery;
  if (table === "briefings") return mockBriefingsQuery;
  return mockCheckinsQuery;
});

import { createClient } from "@supabase/supabase-js";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("../client", () => ({
  inngest: {
    createFunction: vi.fn((_config: unknown, fn: unknown) => fn),
  },
}));

type StepFn = (name: string, fn: () => Promise<unknown>) => Promise<unknown>;

async function runRetentionCleanup() {
  const mod = await import("../functions/retentionCleanup");
  const fn = mod.retentionCleanup as unknown as (ctx: {
    step: { run: StepFn };
  }) => Promise<{ checkinsDeleted: number; briefingsDeleted: number; ranAt: string }>;

  const stepRun = vi.fn(async (_name: string, cb: () => Promise<unknown>) => cb());
  const step = { run: stepRun as unknown as StepFn };

  const result = await fn({ step });
  return { result, stepRun };
}

describe("retentionCleanup Inngest function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";

    mockCheckinsQuery.select.mockResolvedValue({
      data: [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
      error: null,
    });
    mockBriefingsQuery.select.mockResolvedValue({
      data: [{ id: "b1" }, { id: "b2" }],
      error: null,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes checkins older than 12 months using the checked_in_at cutoff", async () => {
    await runRetentionCleanup();
    expect(mockFrom).toHaveBeenCalledWith("checkins");
    expect(mockCheckinsQuery.delete).toHaveBeenCalled();
    expect(mockCheckinsQuery.lt).toHaveBeenCalledWith(
      "checked_in_at",
      "2024-06-01T00:00:00.000Z"
    );
    expect(mockCheckinsQuery.select).toHaveBeenCalledWith("id");
  });

  it("deletes briefings older than 6 months using the briefing_date cutoff (date only)", async () => {
    await runRetentionCleanup();
    expect(mockFrom).toHaveBeenCalledWith("briefings");
    expect(mockBriefingsQuery.delete).toHaveBeenCalled();
    expect(mockBriefingsQuery.lt).toHaveBeenCalledWith("briefing_date", "2024-12-01");
    expect(mockBriefingsQuery.select).toHaveBeenCalledWith("id");
  });

  it("runs both deletions inside a single step ('delete-stale-data')", async () => {
    const { stepRun } = await runRetentionCleanup();
    expect(stepRun).toHaveBeenCalledTimes(1);
    expect(stepRun).toHaveBeenCalledWith("delete-stale-data", expect.any(Function));
  });

  it("returns deleted counts and an ISO ranAt timestamp", async () => {
    const { result } = await runRetentionCleanup();
    expect(result.checkinsDeleted).toBe(3);
    expect(result.briefingsDeleted).toBe(2);
    expect(result.ranAt).toBe("2025-06-01T00:00:00.000Z");
  });

  it("treats missing delete data as zero counts (idempotent re-run)", async () => {
    mockCheckinsQuery.select.mockResolvedValue({ data: null, error: null });
    mockBriefingsQuery.select.mockResolvedValue({ data: [], error: null });
    const { result } = await runRetentionCleanup();
    expect(result.checkinsDeleted).toBe(0);
    expect(result.briefingsDeleted).toBe(0);
  });

  it("uses a service-role client built from the env credentials", async () => {
    await runRetentionCleanup();
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "service-role-secret"
    );
  });

  it("throws (triggering Inngest retry) when checkins delete returns an error", async () => {
    mockCheckinsQuery.select.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });
    await expect(runRetentionCleanup()).rejects.toThrow("Checkins retention delete failed");
  });

  it("throws (triggering Inngest retry) when briefings delete returns an error", async () => {
    mockBriefingsQuery.select.mockResolvedValue({
      data: null,
      error: { message: "connection timeout" },
    });
    await expect(runRetentionCleanup()).rejects.toThrow("Briefings retention delete failed");
  });

  it("emits a structured retention_cleanup_complete log with no PII fields", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runRetentionCleanup();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("retention_cleanup_complete")
    );

    const logLine = consoleSpy.mock.calls.find((c) =>
      String(c[0]).includes("retention_cleanup_complete")
    )?.[0] as string;
    const parsed = JSON.parse(logLine);

    expect(parsed).toEqual({
      event: "retention_cleanup_complete",
      checkinsDeleted: 3,
      briefingsDeleted: 2,
      ranAt: "2025-06-01T00:00:00.000Z",
    });
    // No user-identifying fields leak into the log
    expect(Object.keys(parsed)).not.toContain("userId");
    expect(logLine.toLowerCase()).not.toContain("email");

    consoleSpy.mockRestore();
  });
});
