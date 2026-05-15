import { describe, it, expect } from "vitest";
import { isValidContent, isSafeUrl } from "../content";

describe("isValidContent", () => {
  it("returns true for valid content", () => {
    expect(isValidContent({ greeting: "Hi", suggestions: [] })).toBe(true);
  });

  it("returns true when suggestions contain objects", () => {
    expect(isValidContent({ greeting: "Hi", suggestions: [{ domain: "health", title: "T", body: "B" }] })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidContent(null)).toBe(false);
  });

  it("returns false when greeting is not a string", () => {
    expect(isValidContent({ greeting: 42, suggestions: [] })).toBe(false);
  });

  it("returns false when suggestions is not an array", () => {
    expect(isValidContent({ greeting: "Hi", suggestions: "bad" })).toBe(false);
  });

  it("returns false when any suggestion item is null", () => {
    expect(isValidContent({ greeting: "Hi", suggestions: [null] })).toBe(false);
  });

  it("returns false when any suggestion item is a primitive", () => {
    expect(isValidContent({ greeting: "Hi", suggestions: ["string"] })).toBe(false);
  });
});

describe("isSafeUrl", () => {
  it("allows https:// URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
  });

  it("allows absolute paths", () => {
    expect(isSafeUrl("/checkin")).toBe(true);
  });

  it("allows http:// URLs", () => {
    expect(isSafeUrl("http://example.com")).toBe(true);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isSafeUrl("//evil.com")).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects null", () => {
    expect(isSafeUrl(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSafeUrl(undefined)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isSafeUrl("")).toBe(false);
  });
});
