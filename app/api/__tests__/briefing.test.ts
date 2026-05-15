import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as GET_LIST } from "../briefing/route";
import { GET as GET_ONE, PATCH } from "../briefing/[id]/route";
import { NextRequest } from "next/server";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/utils/supabase/server";

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "gte", "order", "limit", "single", "insert", "update"];
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

beforeEach(() => vi.clearAllMocks());

// ── GET /api/briefing ─────────────────────────────────────────────────────────

describe("GET /api/briefing", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauth();
    const res = await GET_LIST();
    expect(res.status).toBe(401);
  });

  it("returns briefing list", async () => {
    const briefings = [
      { id: "b1", briefing_date: "2026-05-15", content: {}, email_status: "delivered" },
    ];
    mockAuth(() => makeChain({ data: briefings, error: null }));
    const res = await GET_LIST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("returns 500 on DB error", async () => {
    mockAuth(() => makeChain({ data: null, error: new Error("db fail") }));
    const res = await GET_LIST();
    expect(res.status).toBe(500);
  });
});

// ── GET /api/briefing/[id] ────────────────────────────────────────────────────

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(body?: unknown) {
  return new NextRequest("http://localhost/api/briefing/b1", {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/briefing/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauth();
    const res = await GET_ONE(new NextRequest("http://localhost/api/briefing/b1"), makeParams("b1"));
    expect(res.status).toBe(401);
  });

  it("returns briefing by id", async () => {
    const briefing = { id: "b1", briefing_date: "2026-05-15", content: {}, email_status: "delivered" };
    mockAuth(() => makeChain({ data: briefing, error: null }));
    const res = await GET_ONE(new NextRequest("http://localhost/api/briefing/b1"), makeParams("b1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("b1");
  });

  it("returns 404 when not found", async () => {
    mockAuth(() => makeChain({ data: null, error: new Error("PGRST116") }));
    const res = await GET_ONE(new NextRequest("http://localhost/api/briefing/b1"), makeParams("b1"));
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/briefing/[id] ──────────────────────────────────────────────────

describe("PATCH /api/briefing/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauth();
    const res = await PATCH(req({ helpful: true }), makeParams("b1"));
    expect(res.status).toBe(401);
  });

  it("updates helpful flag and returns 200", async () => {
    const updated = { id: "b1", helpful: true };
    mockAuth(() => makeChain({ data: updated, error: null }));
    const res = await PATCH(req({ helpful: true }), makeParams("b1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.helpful).toBe(true);
  });

  it("returns 422 for invalid payload", async () => {
    mockAuth(() => makeChain({ data: null, error: null }));
    const res = await PATCH(req({ helpful: "yes" }), makeParams("b1"));
    expect(res.status).toBe(422);
  });

  it("returns 404 when briefing not found", async () => {
    mockAuth(() => makeChain({ data: null, error: new Error("PGRST116") }));
    const res = await PATCH(req({ helpful: false }), makeParams("b1"));
    expect(res.status).toBe(404);
  });
});
