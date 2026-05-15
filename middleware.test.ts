import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from "@supabase/ssr";
import { updateSession } from "./utils/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost${pathname}`);
}

function makeSupabaseClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateSession — unauthenticated user", () => {
  beforeEach(() => {
    (createServerClient as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, _key: string, { cookies }: { cookies: { setAll: (c: unknown[]) => void } }) => {
        cookies.setAll([]);
        return makeSupabaseClient(null);
      }
    );
  });

  it("redirects /dashboard to /sign-in", async () => {
    const res = await updateSession(makeRequest("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  it("redirects /goals to /sign-in", async () => {
    const res = await updateSession(makeRequest("/goals"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  it("redirects /briefing/some-id to /sign-in", async () => {
    const res = await updateSession(makeRequest("/briefing/abc-123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  it("redirects /checkin to /sign-in", async () => {
    const res = await updateSession(makeRequest("/checkin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  it("redirects /settings to /sign-in", async () => {
    const res = await updateSession(makeRequest("/settings"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  it("does NOT redirect /sign-in (public route)", async () => {
    const res = await updateSession(makeRequest("/sign-in"));
    expect(res.status).not.toBe(307);
  });

  it("does NOT redirect /api/health (public API)", async () => {
    const res = await updateSession(makeRequest("/api/health"));
    expect(res.status).not.toBe(307);
  });
});

describe("updateSession — authenticated user", () => {
  beforeEach(() => {
    (createServerClient as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, _key: string, { cookies }: { cookies: { setAll: (c: unknown[]) => void } }) => {
        cookies.setAll([]);
        return makeSupabaseClient({ id: "user-1" });
      }
    );
  });

  it("allows /dashboard through", async () => {
    const res = await updateSession(makeRequest("/dashboard"));
    expect(res.status).not.toBe(307);
  });

  it("allows /goals through", async () => {
    const res = await updateSession(makeRequest("/goals"));
    expect(res.status).not.toBe(307);
  });

  it("returns a NextResponse (session refresh)", async () => {
    const res = await updateSession(makeRequest("/dashboard"));
    expect(res).toBeInstanceOf(NextResponse);
  });
});
