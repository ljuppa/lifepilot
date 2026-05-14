import { describe, it, expect } from "vitest";
import { SignUpSchema, SignInSchema } from "../auth";

describe("SignUpSchema", () => {
  const valid = { email: "test@example.com", password: "password123", ageConfirmed: true as const };

  it("accepts valid signup data", () => {
    expect(SignUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = SignUpSchema.safeParse({ ...valid, password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("8 characters");
    }
  });

  it("rejects invalid email", () => {
    const result = SignUpSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects when ageConfirmed is false", () => {
    const result = SignUpSchema.safeParse({ ...valid, ageConfirmed: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("18 or older");
    }
  });

  it("rejects missing ageConfirmed", () => {
    const result = SignUpSchema.safeParse({ email: valid.email, password: valid.password });
    expect(result.success).toBe(false);
  });
});

describe("SignInSchema", () => {
  it("accepts valid signin data", () => {
    expect(SignInSchema.safeParse({ email: "user@example.com", password: "anypassword" }).success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = SignInSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = SignInSchema.safeParse({ email: "bad", password: "pass" });
    expect(result.success).toBe(false);
  });
});
