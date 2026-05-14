import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/utils/supabase/server";
import { GET, POST } from "@/app/api/goals/route";
import { DELETE } from "@/app/api/goals/[id]/route";

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "single", "insert", "update", "head"]) {
    chain[m] = () => chain;
  }
  chain["then"] = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return chain;
}

function mockUnauth() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("no session") }) },
    from: vi.fn(),
  };
}

function mockAuth(from = vi.fn()) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null }) },
    from,
  };
}

beforeEach(() => vi.clearAllMocks());

// ── GET /api/goals ─────────────────────────────────────────────────────────────

describe("GET /api/goals", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockUnauth() as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("returns active goals list when authenticated", async () => {
    const goals = [{ id: "g1", domain: "health", title: "Run 5k", status: "active" }];
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ data: goals, error: null }))) as never
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].domain).toBe("health");
  });

  it("returns 500 on DB error", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ data: null, error: { code: "DB_ERR" } }))) as never
    );
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── POST /api/goals ────────────────────────────────────────────────────────────

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/goals", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/goals", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockUnauth() as never);
    const res = await POST(postReq({ domain: "health", title: "Run 5k" }));
    expect(res.status).toBe(401);
  });

  it("returns 422 for missing domain", async () => {
    vi.mocked(createClient).mockResolvedValue(mockAuth() as never);
    const res = await POST(postReq({ title: "Run 5k" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 for invalid domain value", async () => {
    vi.mocked(createClient).mockResolvedValue(mockAuth() as never);
    const res = await POST(postReq({ domain: "unknown", title: "Test" }));
    expect(res.status).toBe(422);
  });

  it("returns 400 when goal limit (3) is already reached", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(
        vi.fn()
          .mockReturnValueOnce(makeChain({ count: 3, error: null })) // count check
      ) as never
    );
    const res = await POST(postReq({ domain: "health", title: "Run 5k" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("GOAL_LIMIT");
  });

  it("creates goal and returns 201 when under limit", async () => {
    const newGoal = { id: "g1", domain: "health", title: "Run 5k", status: "active" };
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(
        vi.fn()
          .mockReturnValueOnce(makeChain({ count: 0, error: null })) // count check
          .mockReturnValueOnce(makeChain({ data: newGoal, error: null })) // insert
      ) as never
    );
    const res = await POST(postReq({ domain: "health", title: "Run 5k" }));
    expect(res.status).toBe(201);
    expect((await res.json()).data.domain).toBe("health");
  });
});

// ── DELETE /api/goals/[id] ─────────────────────────────────────────────────────

function deleteReq(id: string) {
  return new NextRequest(`http://localhost/api/goals/${id}`, { method: "DELETE" });
}

function deleteParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/goals/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockUnauth() as never);
    const res = await DELETE(deleteReq("g1"), deleteParams("g1"));
    expect(res.status).toBe(401);
  });

  it("soft-deletes goal and returns 200", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ error: null }))) as never
    );
    const res = await DELETE(deleteReq("g1"), deleteParams("g1"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.deleted).toBe(true);
  });

  it("returns 500 on DB error", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ error: { code: "DB_ERR" } }))) as never
    );
    const res = await DELETE(deleteReq("g1"), deleteParams("g1"));
    expect(res.status).toBe(500);
  });
});
