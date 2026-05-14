import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows the first request for a new key", () => {
    const result = checkRateLimit(`rl-first-${crypto.randomUUID()}`, 5);
    expect(result.ok).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("allows consecutive requests up to the limit", () => {
    const key = `rl-upto-${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5).ok).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    const key = `rl-block-${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3);
    const result = checkRateLimit(key, 3);
    expect(result.ok).toBe(false);
  });

  it("returns retryAfterSeconds > 0 when blocked", () => {
    const key = `rl-retry-${crypto.randomUUID()}`;
    checkRateLimit(key, 1);
    const result = checkRateLimit(key, 1);
    expect(result.ok).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the window after the 15-minute window expires", () => {
    vi.useFakeTimers();
    const key = `rl-reset-${crypto.randomUUID()}`;

    for (let i = 0; i < 3; i++) checkRateLimit(key, 3);
    expect(checkRateLimit(key, 3).ok).toBe(false);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    expect(checkRateLimit(key, 3).ok).toBe(true);
  });

  it("does not reset before the window expires", () => {
    vi.useFakeTimers();
    const key = `rl-noreset-${crypto.randomUUID()}`;

    for (let i = 0; i < 3; i++) checkRateLimit(key, 3);
    vi.advanceTimersByTime(14 * 60 * 1000); // 14 min — still within window
    expect(checkRateLimit(key, 3).ok).toBe(false);
  });
});
