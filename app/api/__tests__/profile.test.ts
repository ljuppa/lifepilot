import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/utils/supabase/server";
import { GET, POST, PATCH } from "@/app/api/profile/route";

// Thenable chain — any method call returns the same object; awaiting resolves to `result`.
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "single", "insert", "update", "upsert"]) {
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

// ── GET ────────────────────────────────────────────────────────────────────────

describe("GET /api/profile", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockUnauth() as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("returns profile data when found", async () => {
    const profile = { id: "uid-1", name: "Alice", briefing_time: "07:00", timezone: "UTC" };
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ data: profile, error: null }))) as never
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).data.name).toBe("Alice");
  });

  it("returns { data: null } when no profile row exists (PGRST116)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ data: null, error: { code: "PGRST116" } }))) as never
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toBeNull();
  });

  it("returns 500 on unexpected DB error", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ data: null, error: { code: "UNEXPECTED" } }))) as never
    );
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── POST ───────────────────────────────────────────────────────────────────────

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/profile", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/profile", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockUnauth() as never);
    const res = await POST(postReq({ name: "Alice", age: 25, briefing_time: "07:00", timezone: "UTC" }));
    expect(res.status).toBe(401);
  });

  it("returns 422 for validation failure (age < 18)", async () => {
    vi.mocked(createClient).mockResolvedValue(mockAuth() as never);
    const res = await POST(postReq({ name: "Alice", age: 10, briefing_time: "07:00", timezone: "UTC" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(mockAuth() as never);
    const req = new NextRequest("http://localhost/api/profile", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates profile and returns 200 on success", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ error: null }))) as never
    );
    const res = await POST(postReq({ name: "Alice", age: 28, briefing_time: "07:00", timezone: "UTC" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.created).toBe(true);
  });

  it("returns 500 when DB insert fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ error: { code: "23505" } }))) as never
    );
    const res = await POST(postReq({ name: "Alice", age: 28, briefing_time: "07:00", timezone: "UTC" }));
    expect(res.status).toBe(500);
  });
});

// ── PATCH ──────────────────────────────────────────────────────────────────────

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/profile", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockUnauth() as never);
    const res = await PATCH(patchReq({ name: "Bob" }));
    expect(res.status).toBe(401);
  });

  it("updates profile and returns 200 on success", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ error: null }))) as never
    );
    const res = await PATCH(patchReq({ name: "Bob" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.updated).toBe(true);
  });

  it("returns 422 for invalid patch data", async () => {
    vi.mocked(createClient).mockResolvedValue(mockAuth() as never);
    const res = await PATCH(patchReq({ age: 5 })); // age < 18
    expect(res.status).toBe(422);
  });

  it("returns 500 when DB update fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(vi.fn().mockReturnValue(makeChain({ error: { code: "DB_ERROR" } }))) as never
    );
    const res = await PATCH(patchReq({ name: "Bob" }));
    expect(res.status).toBe(500);
  });
});
