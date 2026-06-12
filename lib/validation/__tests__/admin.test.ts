import { describe, it, expect } from "vitest";
import { AdminUserLookupSchema } from "../admin";

describe("AdminUserLookupSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts a valid UUID v4", () => {
    expect(AdminUserLookupSchema.safeParse({ userId: validUuid }).success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    const result = AdminUserLookupSchema.safeParse({ userId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("UUID");
    }
  });

  it("rejects null userId", () => {
    const result = AdminUserLookupSchema.safeParse({ userId: null });
    expect(result.success).toBe(false);
  });

  it("rejects missing userId", () => {
    const result = AdminUserLookupSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = AdminUserLookupSchema.safeParse({ userId: "" });
    expect(result.success).toBe(false);
  });
});
