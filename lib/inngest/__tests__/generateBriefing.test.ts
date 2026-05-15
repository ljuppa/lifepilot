import { describe, it, expect, vi, beforeEach } from "vitest";
import { filterLlmOutput } from "@/lib/claude/safety";
import { buildBriefingPrompt } from "@/lib/claude/prompts";
import { buildBriefingEmail } from "@/lib/email/templates/briefing";

// Unit-level tests for the pipeline building blocks used by generateBriefing.
// The Inngest function itself requires a real Inngest dev server for true E2E
// testing; here we verify the core logic components in isolation.

describe("generateBriefing pipeline — safety integration", () => {
  it("safe LLM output passes through untouched", () => {
    const input = JSON.stringify({
      greeting: "Good morning!",
      suggestions: [{ domain: "health", title: "Walk 30 min", body: "A brisk walk improves energy." }],
    });
    const { content, triggered } = filterLlmOutput(input);
    expect(triggered).toBe(false);
    expect(content).toBe(input);
  });

  it("unsafe output is replaced with fallback", () => {
    const input = "Aim for only 800 calories today to lose weight fast.";
    const { triggered } = filterLlmOutput(input);
    expect(triggered).toBe(true);
  });
});

describe("generateBriefing pipeline — prompt integration", () => {
  it("prompt built for multi-domain goals includes all domains in user block", () => {
    const ctx = {
      profile: { name: "Bob", age: 35, timezone: "UTC" },
      goals: [
        { domain: "health", title: "Run 5k" },
        { domain: "finance", title: "Save 15%" },
        { domain: "wellness", title: "8h sleep" },
      ],
      checkins: [],
      today: "2026-05-15",
      dayOfWeek: "Thursday",
    };
    const { messages } = buildBriefingPrompt(ctx);
    const content = messages[0].content as string;
    expect(content).toContain("health");
    expect(content).toContain("finance");
    expect(content).toContain("wellness");
  });
});

describe("generateBriefing pipeline — email integration", () => {
  it("email subject follows correct format", () => {
    const ctx = {
      userName: "Alice",
      userEmail: "alice@example.com",
      dayOfWeek: "Thursday",
      greeting: "Good morning, Alice!",
      suggestions: [{ domain: "health", title: "Stay hydrated", body: "Drink 8 glasses today.", action_link_text: null, action_link_url: null }],
      appBaseUrl: "https://lifepilot.app",
    };
    const { subject } = buildBriefingEmail(ctx);
    expect(subject).toBe("Your Thursday — Stay hydrated");
  });

  it("email html contains AI disclosure footer", () => {
    const ctx = {
      userName: "Alice",
      userEmail: "alice@example.com",
      dayOfWeek: "Thursday",
      greeting: "Good morning!",
      suggestions: [{ domain: "health", title: "Walk", body: "Walk 30 min.", action_link_text: null, action_link_url: null }],
      appBaseUrl: "https://lifepilot.app",
    };
    const { html } = buildBriefingEmail(ctx);
    expect(html).toContain("AI-generated — not medical");
  });

  it("email plain-text alternative is included", () => {
    const ctx = {
      userName: "Alice",
      userEmail: "alice@example.com",
      dayOfWeek: "Thursday",
      greeting: "Good morning!",
      suggestions: [{ domain: "health", title: "Walk", body: "Walk 30 min.", action_link_text: null, action_link_url: null }],
      appBaseUrl: "https://lifepilot.app",
    };
    const { text } = buildBriefingEmail(ctx);
    expect(text).toContain("That's your Thursday, Alice. Make it count.");
    expect(text).toContain("AI-generated");
  });

  it("email sign-off contains user name and day", () => {
    const ctx = {
      userName: "Bob",
      userEmail: "bob@example.com",
      dayOfWeek: "Monday",
      greeting: "Morning!",
      suggestions: [{ domain: "wellness", title: "Sleep", body: "8 hours tonight.", action_link_text: null, action_link_url: null }],
      appBaseUrl: "https://lifepilot.app",
    };
    const { html, text } = buildBriefingEmail(ctx);
    expect(html).toContain("That's your Monday, Bob. Make it count.");
    expect(text).toContain("That's your Monday, Bob. Make it count.");
  });
});
