import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/utils/supabase/server";
import { GET } from "@/app/api/goals/[id]/progress/route";

const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
})();

const VALID_UUID = "00000000-0000-0000-0000-000000000001";

async function callGet(id = VALID_UUID) {
  return GET(new Request("http://localhost"), {
    params: Promise.resolve({ id }),
  });
}

function makeFrom(
  goal: unknown,
  checkinDates: string[],
  metricRows: { health_metric?: number; finance_metric?: number; wellness_metric?: number }[] = []
) {
  let checkinCallCount = 0;

  return (table: string) => {
    if (table === "goals") {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "not", "order", "limit"]) q[m] = () => q;
      q.single = async () => ({ data: goal, error: goal ? null : new Error("not found") });
      return q;
    }
    if (table === "checkins") {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "not", "gte", "order", "limit"]) q[m] = () => q;
      q.maybeSingle = async () => ({ data: metricRows[0] ?? null, error: null });
      q.then = (resolve: (v: unknown) => unknown) => {
        checkinCallCount++;
        if (checkinCallCount === 1) {
          // First call: streak date query
          return Promise.resolve({
            data: checkinDates.map((d) => ({ checked_in_at: `${d}T08:00:00Z` })),
            error: null,
          }).then(resolve);
        }
        // Subsequent calls: metric query
        return Promise.resolve({ data: metricRows, error: null }).then(resolve);
      };
      return q;
    }
    return {};
  };
}

function mockClient(
  user: { id: string } | null,
  goal: unknown,
  checkinDates: string[] = [],
  metricRows: object[] = []
) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: makeFrom(goal, checkinDates, metricRows),
  } as never);
}

const mockGoal = (domain: string, targetValue: number | null = 10) => ({
  id: VALID_UUID,
  domain,
  target_value: targetValue,
  user_id: "uid-1",
});

beforeEach(() => vi.clearAllMocks());

describe("GET /api/goals/[id]/progress — id validation", () => {
  it("returns 404 for a non-UUID id before hitting the database", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "uid-1" } }, error: null }) },
      from: vi.fn(),
    } as never);
    const res = await callGet("not-a-uuid");
    expect(res.status).toBe(404);
    expect(vi.mocked(createClient).mock.instances.length).toBeGreaterThan(0);
  });
});

describe("GET /api/goals/[id]/progress — auth", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error("no session") }) },
      from: vi.fn(),
    } as never);
    const res = await callGet();
    expect(res.status).toBe(401);
  });

  it("returns 404 when goal not found or belongs to another user", async () => {
    mockClient({ id: "uid-1" }, null);
    const res = await callGet();
    expect(res.status).toBe(404);
  });
});

describe("GET /api/goals/[id]/progress — target_value null or zero", () => {
  it("returns null progress when goal has no target_value", async () => {
    mockClient({ id: "uid-1" }, mockGoal("health", null), [TODAY]);
    const res = await callGet();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.progressPercent).toBeNull();
    expect(data.progressLabel).toBeNull();
    expect(data.currentValue).toBeNull();
  });

  it("returns null progress when target_value is 0 (avoids division by zero)", async () => {
    mockClient({ id: "uid-1" }, mockGoal("health", 0), [TODAY], [{ health_metric: 50 }]);
    const res = await callGet();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.progressPercent).toBeNull();
  });
});

describe("GET /api/goals/[id]/progress — streak computation", () => {
  it("returns streakDays=0 when no check-ins", async () => {
    mockClient({ id: "uid-1" }, mockGoal("health", null), []);
    const res = await callGet();
    const { data } = await res.json();
    expect(data.streakDays).toBe(0);
  });

  it("counts streak including today", async () => {
    mockClient({ id: "uid-1" }, mockGoal("health", null), [TODAY, YESTERDAY]);
    const res = await callGet();
    const { data } = await res.json();
    expect(data.streakDays).toBe(2);
  });

  it("counts streak from yesterday when no check-in today (not yet broken)", async () => {
    mockClient({ id: "uid-1" }, mockGoal("health", null), [YESTERDAY]);
    const res = await callGet();
    const { data } = await res.json();
    expect(data.streakDays).toBe(1);
  });
});

describe("GET /api/goals/[id]/progress — health domain", () => {
  it("returns null progress when no health_metric check-ins", async () => {
    mockClient({ id: "uid-1" }, mockGoal("health", 70), [TODAY], []);
    const res = await callGet();
    const { data } = await res.json();
    expect(data.progressPercent).toBeNull();
  });

  it("computes progressPercent from most recent health_metric vs target", async () => {
    mockClient({ id: "uid-1" }, mockGoal("health", 100), [TODAY], [{ health_metric: 75 }]);
    const res = await callGet();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.progressPercent).toBe(75);
    expect(data.currentValue).toBe(75);
    expect(data.progressLabel).toContain("75.0");
  });
});

describe("GET /api/goals/[id]/progress — finance domain", () => {
  it("sums finance_metric for the current month", async () => {
    mockClient(
      { id: "uid-1" },
      mockGoal("finance", 2000),
      [TODAY],
      [{ finance_metric: 500 }, { finance_metric: 700 }]
    );
    const res = await callGet();
    const { data } = await res.json();
    expect(data.progressPercent).toBe(60); // 1200/2000*100
    expect(data.progressLabel).toContain("$1200");
    expect(data.progressLabel).toContain("$2000");
  });

  it("caps progressPercent at 150 when over budget", async () => {
    mockClient(
      { id: "uid-1" },
      mockGoal("finance", 1000),
      [TODAY],
      [{ finance_metric: 2000 }]
    );
    const res = await callGet();
    const { data } = await res.json();
    expect(data.progressPercent).toBe(150);
  });
});

describe("GET /api/goals/[id]/progress — wellness domain", () => {
  it("returns 7-day average of wellness_metric", async () => {
    mockClient(
      { id: "uid-1" },
      mockGoal("wellness", 8),
      [TODAY],
      [{ wellness_metric: 7 }, { wellness_metric: 9 }]
    );
    const res = await callGet();
    const { data } = await res.json();
    expect(data.progressPercent).toBe(100); // avg=8, target=8 → 100%
    expect(data.progressLabel).toContain("8.0 / 8.0 hrs avg");
  });
});
