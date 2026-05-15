import { describe, it, expect } from "vitest";
import {
  ProfileStep1Schema,
  ProfileStep2Schema,
  ProfileStep4Schema,
  ProfileConsentSchema,
  ProfileUpdateSchema,
} from "@/lib/validation/profile";
import { GoalInputSchema } from "@/lib/validation/goal";

describe("ProfileStep1Schema", () => {
  it("accepts valid profile step 1", () => {
    const result = ProfileStep1Schema.safeParse({ name: "Alice", age: 28 });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = ProfileStep1Schema.safeParse({ name: "", age: 28 });
    expect(result.success).toBe(false);
  });

  it("rejects age below 18", () => {
    const result = ProfileStep1Schema.safeParse({ name: "Alice", age: 17 });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields omitted", () => {
    const result = ProfileStep1Schema.safeParse({ name: "Alice", age: 30 });
    expect(result.success).toBe(true);
  });
});

describe("ProfileStep2Schema", () => {
  it("accepts empty object (all optional)", () => {
    const result = ProfileStep2Schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid budget values", () => {
    const result = ProfileStep2Schema.safeParse({
      monthly_income: 3000,
      fixed_expenses: 1200,
      discretionary_budget: 500,
    });
    expect(result.success).toBe(true);
  });
});

describe("GoalInputSchema", () => {
  it("accepts valid goal", () => {
    const result = GoalInputSchema.safeParse({ domain: "health", title: "Run 5k" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid domain", () => {
    const result = GoalInputSchema.safeParse({ domain: "unknown", title: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = GoalInputSchema.safeParse({ domain: "health", title: "" });
    expect(result.success).toBe(false);
  });
});

describe("ProfileStep4Schema", () => {
  it("accepts valid time and timezone", () => {
    const result = ProfileStep4Schema.safeParse({ briefing_time: "07:30", timezone: "Europe/London" });
    expect(result.success).toBe(true);
  });

  it("rejects malformed time", () => {
    const result = ProfileStep4Schema.safeParse({ briefing_time: "7:30am", timezone: "UTC" });
    expect(result.success).toBe(false);
  });
});

describe("ProfileConsentSchema", () => {
  it("accepts consent: true", () => {
    const result = ProfileConsentSchema.safeParse({ consent: true });
    expect(result.success).toBe(true);
  });

  it("rejects consent: false", () => {
    const result = ProfileConsentSchema.safeParse({ consent: false });
    expect(result.success).toBe(false);
  });
});

describe("ProfileUpdateSchema", () => {
  it("accepts partial update", () => {
    const result = ProfileUpdateSchema.safeParse({ name: "Bob" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = ProfileUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects age below 18", () => {
    const result = ProfileUpdateSchema.safeParse({ age: 10 });
    expect(result.success).toBe(false);
  });
});
