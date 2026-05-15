import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/utils/supabase/server";
import { GET } from "@/app/api/checkins/summary/route";

async function callGet() {
  return GET();
}

type CheckinRow = { checked_in_at: string };
type MetricRow = {
  health_metric?: number | null;
  finance_metric?: number | null;
  wellness_metric?: number | null;
};

function makeSupabaseMock(opts: {
  user: { id: string } | null;
  checkinRows?: CheckinRow[];
  briefingsCount?: number;
  metricRows?: MetricRow[];
}) {
  const { user, checkinRows = [], briefingsCount = 0, metricRows = [] } = opts;

  let callIdx = 0;

  const from = (table: string) => {
    if (table === "checkins") {
      callIdx++;
      const currentIdx = callIdx;
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "gte", "lte", "order", "limit"]) q[m] = () => q;
      // First checkins call: week check-ins; second: metric averages
      q.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({
          data: currentIdx === 1 ? checkinRows : metricRows,
          error: null,
        }).then(resolve);
      return q;
    }
    if (table === "briefings") {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "gte", "lte"]) q[m] = () => q;
      q.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ count: briefingsCount, error: null }).then(resolve);
      return q;
    }
    return {};
  };

  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: user ? null : new Error("no session") }) },
    from,
  } as never);
}

beforeEach(() => vi.clearAllMocks());

// Helpers to build check-in rows within the current Mon–Sun week
function todayIso() {
  return new Date().toISOString();
}
function isoForDaysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

describe("GET /api/checkins/summary — auth", () => {
  it("returns 401 when unauthenticated", async () => {
    makeSupabaseMock({ user: null });
    const res = await callGet();
    expect(res.status).toBe(401);
  });
});

describe("GET /api/checkins/summary — daysCheckedInThisWeek", () => {
  it("returns 0 when no check-ins this week", async () => {
    makeSupabaseMock({ user: { id: "uid-1" }, checkinRows: [] });
    const res = await callGet();
    const { data } = await res.json();
    expect(data.daysCheckedInThisWeek).toBe(0);
  });

  it("deduplicates multiple check-ins on the same calendar day", async () => {
    const today = new Date().toISOString().slice(0, 10);
    makeSupabaseMock({
      user: { id: "uid-1" },
      checkinRows: [
        { checked_in_at: `${today}T08:00:00Z` },
        { checked_in_at: `${today}T20:00:00Z` },
      ],
    });
    const res = await callGet();
    const { data } = await res.json();
    expect(data.daysCheckedInThisWeek).toBe(1);
  });

  it("counts multiple distinct days correctly", async () => {
    const today = new Date();
    const d0 = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const d1 = yesterday.toISOString().slice(0, 10);
    makeSupabaseMock({
      user: { id: "uid-1" },
      checkinRows: [
        { checked_in_at: `${d0}T09:00:00Z` },
        { checked_in_at: `${d1}T09:00:00Z` },
      ],
    });
    const res = await callGet();
    const { data } = await res.json();
    expect(data.daysCheckedInThisWeek).toBe(2);
  });
});

describe("GET /api/checkins/summary — briefingsThisWeek", () => {
  it("returns 0 when no briefings this week", async () => {
    makeSupabaseMock({ user: { id: "uid-1" }, briefingsCount: 0 });
    const res = await callGet();
    const { data } = await res.json();
    expect(data.briefingsThisWeek).toBe(0);
  });

  it("returns correct briefings count", async () => {
    makeSupabaseMock({ user: { id: "uid-1" }, briefingsCount: 3 });
    const res = await callGet();
    const { data } = await res.json();
    expect(data.briefingsThisWeek).toBe(3);
  });
});

describe("GET /api/checkins/summary — domainAverages", () => {
  it("returns null for all domains when no metric rows", async () => {
    makeSupabaseMock({ user: { id: "uid-1" }, metricRows: [] });
    const res = await callGet();
    const { data } = await res.json();
    expect(data.domainAverages.health).toBeNull();
    expect(data.domainAverages.finance).toBeNull();
    expect(data.domainAverages.wellness).toBeNull();
  });

  it("computes correct averages from metric rows", async () => {
    makeSupabaseMock({
      user: { id: "uid-1" },
      metricRows: [
        { health_metric: 6, finance_metric: 500, wellness_metric: 7 },
        { health_metric: 8, finance_metric: 300, wellness_metric: 9 },
      ],
    });
    const res = await callGet();
    const { data } = await res.json();
    expect(data.domainAverages.health).toBeCloseTo(7);
    expect(data.domainAverages.finance).toBeCloseTo(400);
    expect(data.domainAverages.wellness).toBeCloseTo(8);
  });

  it("skips null metric values in average", async () => {
    makeSupabaseMock({
      user: { id: "uid-1" },
      metricRows: [
        { health_metric: 10, finance_metric: null, wellness_metric: null },
        { health_metric: null, finance_metric: null, wellness_metric: null },
      ],
    });
    const res = await callGet();
    const { data } = await res.json();
    expect(data.domainAverages.health).toBeCloseTo(10);
    expect(data.domainAverages.finance).toBeNull();
    expect(data.domainAverages.wellness).toBeNull();
  });
});

describe("GET /api/checkins/summary — week boundary", () => {
  it("response shape is correct for a normal day", async () => {
    makeSupabaseMock({ user: { id: "uid-1" } });
    const res = await callGet();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(typeof data.daysCheckedInThisWeek).toBe("number");
    expect(typeof data.briefingsThisWeek).toBe("number");
    expect(data.domainAverages).toHaveProperty("health");
    expect(data.domainAverages).toHaveProperty("finance");
    expect(data.domainAverages).toHaveProperty("wellness");
  });
});
