import { describe, it, expect } from "vitest";
import { CheckinSchema } from "@/lib/validation/checkin";

describe("CheckinSchema", () => {
  it("accepts valid mood only", () => {
    const result = CheckinSchema.safeParse({ mood: 3 });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = CheckinSchema.safeParse({
      mood: 5,
      health_metric: 72.5,
      finance_metric: 45,
      wellness_metric: 7.5,
      note: "great day",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mood below 1", () => {
    expect(CheckinSchema.safeParse({ mood: 0 }).success).toBe(false);
  });

  it("rejects mood above 5", () => {
    expect(CheckinSchema.safeParse({ mood: 6 }).success).toBe(false);
  });

  it("rejects missing mood", () => {
    expect(CheckinSchema.safeParse({}).success).toBe(false);
  });

  it("rejects note longer than 80 chars", () => {
    expect(CheckinSchema.safeParse({ mood: 1, note: "x".repeat(81) }).success).toBe(false);
  });

  it("accepts note of exactly 80 chars", () => {
    expect(CheckinSchema.safeParse({ mood: 1, note: "x".repeat(80) }).success).toBe(true);
  });

  it("rejects wellness_metric above 24", () => {
    expect(CheckinSchema.safeParse({ mood: 1, wellness_metric: 25 }).success).toBe(false);
  });
});
