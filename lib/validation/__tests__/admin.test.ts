import { describe, it, expect } from "vitest";
import { AdminUserLookupSchema, AdminBroadcastSchema } from "../admin";

describe("AdminUserLookupSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts a valid UUID", () => {
    expect(AdminUserLookupSchema.safeParse({ userId: validUuid }).success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    const result = AdminUserLookupSchema.safeParse({ userId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("userId must be a valid UUID");
    }
  });

  it("rejects an empty string", () => {
    const result = AdminUserLookupSchema.safeParse({ userId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("userId must be a valid UUID");
    }
  });

  it("rejects when userId is missing", () => {
    const result = AdminUserLookupSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a numeric userId", () => {
    const result = AdminUserLookupSchema.safeParse({ userId: 12345 });
    expect(result.success).toBe(false);
  });
});

describe("AdminBroadcastSchema", () => {
  const validInput = { subject: "Hello everyone", body: "This is a broadcast message." };

  it("accepts valid subject and body", () => {
    expect(AdminBroadcastSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects empty subject", () => {
    const result = AdminBroadcastSchema.safeParse({ ...validInput, subject: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Subject is required");
    }
  });

  it("rejects subject over 120 characters", () => {
    const result = AdminBroadcastSchema.safeParse({ ...validInput, subject: "a".repeat(121) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Subject must be 120 characters or fewer");
    }
  });

  it("accepts subject of exactly 120 characters", () => {
    expect(AdminBroadcastSchema.safeParse({ ...validInput, subject: "a".repeat(120) }).success).toBe(true);
  });

  it("rejects empty body", () => {
    const result = AdminBroadcastSchema.safeParse({ ...validInput, body: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Body is required");
    }
  });

  it("rejects body over 2000 characters", () => {
    const result = AdminBroadcastSchema.safeParse({ ...validInput, body: "a".repeat(2001) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Body must be 2,000 characters or fewer");
    }
  });

  it("accepts body of exactly 2000 characters", () => {
    expect(AdminBroadcastSchema.safeParse({ ...validInput, body: "a".repeat(2000) }).success).toBe(true);
  });

  it("rejects when subject is missing", () => {
    const result = AdminBroadcastSchema.safeParse({ body: validInput.body });
    expect(result.success).toBe(false);
  });

  it("rejects when body is missing", () => {
    const result = AdminBroadcastSchema.safeParse({ subject: validInput.subject });
    expect(result.success).toBe(false);
  });
});
