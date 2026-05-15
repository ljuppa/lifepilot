import { describe, it, expect } from "vitest";
import { generateUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribe";

describe("generateUnsubscribeToken", () => {
  it("generates a hex string", () => {
    const token = generateUnsubscribeToken("uid-1", "briefingEmails");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates a deterministic token for the same inputs", () => {
    const a = generateUnsubscribeToken("uid-1", "briefingEmails");
    const b = generateUnsubscribeToken("uid-1", "briefingEmails");
    expect(a).toBe(b);
  });

  it("generates different tokens for different userId", () => {
    const a = generateUnsubscribeToken("uid-1", "briefingEmails");
    const b = generateUnsubscribeToken("uid-2", "briefingEmails");
    expect(a).not.toBe(b);
  });

  it("generates different tokens for different type", () => {
    const a = generateUnsubscribeToken("uid-1", "briefingEmails");
    const b = generateUnsubscribeToken("uid-1", "reengagementEmails");
    expect(a).not.toBe(b);
  });
});

describe("verifyUnsubscribeToken", () => {
  it("returns true for a valid token", () => {
    const token = generateUnsubscribeToken("uid-abc", "reengagementEmails");
    expect(verifyUnsubscribeToken("uid-abc", "reengagementEmails", token)).toBe(true);
  });

  it("returns false for a tampered token", () => {
    const token = generateUnsubscribeToken("uid-abc", "reengagementEmails");
    expect(verifyUnsubscribeToken("uid-abc", "reengagementEmails", token + "x")).toBe(false);
  });

  it("returns false when userId does not match", () => {
    const token = generateUnsubscribeToken("uid-abc", "briefingEmails");
    expect(verifyUnsubscribeToken("uid-xyz", "briefingEmails", token)).toBe(false);
  });

  it("returns false when type does not match", () => {
    const token = generateUnsubscribeToken("uid-abc", "briefingEmails");
    expect(verifyUnsubscribeToken("uid-abc", "reengagementEmails", token)).toBe(false);
  });
});
