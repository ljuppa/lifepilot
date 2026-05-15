import { describe, it, expect } from "vitest";
import { buildBriefingPrompt } from "../prompts";

const baseCtx = {
  profile: { name: "Alice", age: 30, timezone: "Europe/London" },
  goals: [
    { domain: "health", title: "Run 5k" },
    { domain: "finance", title: "Save 20%" },
  ],
  checkins: [
    {
      mood: 3,
      health_metric: 72.5,
      finance_metric: 45,
      wellness_metric: null,
      note: null,
      checked_in_at: new Date(Date.now() - 86400_000).toISOString(),
    },
  ],
  today: "2026-05-15",
  dayOfWeek: "Thursday",
};

describe("buildBriefingPrompt", () => {
  it("returns system and messages arrays", () => {
    const result = buildBriefingPrompt(baseCtx);
    expect(result.system).toHaveLength(1);
    expect(result.messages).toHaveLength(1);
  });

  it("system block has cache_control ephemeral", () => {
    const { system } = buildBriefingPrompt(baseCtx);
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("system block type is text", () => {
    const { system } = buildBriefingPrompt(baseCtx);
    expect(system[0].type).toBe("text");
  });

  it("user message role is user", () => {
    const { messages } = buildBriefingPrompt(baseCtx);
    expect(messages[0].role).toBe("user");
  });

  it("user block contains today's date", () => {
    const { messages } = buildBriefingPrompt(baseCtx);
    expect(messages[0].content).toContain("2026-05-15");
  });

  it("user block contains user name", () => {
    const { messages } = buildBriefingPrompt(baseCtx);
    expect(messages[0].content).toContain("Alice");
  });

  it("user block contains all active goal domains", () => {
    const { messages } = buildBriefingPrompt(baseCtx);
    const content = messages[0].content as string;
    expect(content).toContain("health");
    expect(content).toContain("finance");
  });

  it("user block includes checkin mood data", () => {
    const { messages } = buildBriefingPrompt(baseCtx);
    expect(messages[0].content).toContain("mood=3/5");
  });

  it("user block includes health metric", () => {
    const { messages } = buildBriefingPrompt(baseCtx);
    expect(messages[0].content).toContain("72.5kg");
  });

  it("handles empty checkins array", () => {
    const ctx = { ...baseCtx, checkins: [] };
    const { messages } = buildBriefingPrompt(ctx);
    expect(messages[0].content).toContain("Last 0 check-ins");
  });
});
