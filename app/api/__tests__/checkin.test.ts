import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "../checkin/route";
import { NextRequest } from "next/server";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/utils/supabase/server";

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "single", "insert", "update"];
  for (const m of methods) chain[m] = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function mockUnauth() {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null }, error: new Error("unauth") }) },
  });
}

function mockAuth(from: (table: string) => unknown) {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
    from,
  });
}

function req(body: unknown) {
  return new NextRequest("http://localhost/api/checkin", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => vi.clearAllMocks());

// ── POST /api/checkin ─────────────────────────────────────────────────────────

describe("POST /api/checkin", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauth();
    const res = await POST(req({ mood: 3 }));
    expect(res.status).toBe(401);
  });

  it("returns 422 for invalid mood (out of range)", async () => {
    mockAuth(() => makeChain({ data: null, error: null }));
    const res = await POST(req({ mood: 6 }));
    expect(res.status).toBe(422);
  });

  it("returns 422 for missing mood", async () => {
    mockAuth(() => makeChain({ data: null, error: null }));
    const res = await POST(req({ note: "test" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 for stale checkin (>24h old)", async () => {
    mockAuth(() => makeChain({ data: null, error: null }));
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const res = await POST(req({ mood: 3, checked_in_at: staleDate }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("STALE_CHECKIN");
  });

  it("returns 201 with valid mood", async () => {
    const newCheckin = { id: "c1", mood: 4, user_id: "user-1" };
    mockAuth(() => makeChain({ data: newCheckin, error: null }));
    const res = await POST(req({ mood: 4 }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.mood).toBe(4);
  });

  it("returns 201 with all optional fields", async () => {
    const payload = { mood: 3, health_metric: 72.5, finance_metric: 45, wellness_metric: 7.5, note: "good day" };
    mockAuth(() => makeChain({ data: { id: "c2", ...payload }, error: null }));
    const res = await POST(req(payload));
    expect(res.status).toBe(201);
  });

  it("returns 500 on DB error", async () => {
    mockAuth(() => makeChain({ data: null, error: new Error("db fail") }));
    const res = await POST(req({ mood: 2 }));
    expect(res.status).toBe(500);
  });
});

// ── GET /api/checkin ──────────────────────────────────────────────────────────

describe("GET /api/checkin", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauth();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns checkin list", async () => {
    const checkins = [{ id: "c1", mood: 4 }, { id: "c2", mood: 2 }];
    mockAuth(() => makeChain({ data: checkins, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });
});
