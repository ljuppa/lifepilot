import { describe, it, expect } from "vitest";
import { filterLlmOutput } from "../safety";

describe("filterLlmOutput", () => {
  it("passes safe content unchanged", () => {
    const result = filterLlmOutput("Go for a 30-minute walk today.");
    expect(result.triggered).toBe(false);
    expect(result.content).toBe("Go for a 30-minute walk today.");
  });

  it("blocks caloric thresholds (kcal)", () => {
    const result = filterLlmOutput("Aim for 1200 kcal today.");
    expect(result.triggered).toBe(true);
  });

  it("blocks caloric thresholds (calories)", () => {
    const result = filterLlmOutput("Keep it under 800 calories.");
    expect(result.triggered).toBe(true);
  });

  it("blocks 'stop eating' language", () => {
    const result = filterLlmOutput("Try to stop eating after 6pm.");
    expect(result.triggered).toBe(true);
  });

  it("blocks specific investment recommendations (buy stock)", () => {
    const result = filterLlmOutput("You should buy AAPL stock this week.");
    expect(result.triggered).toBe(true);
  });

  it("blocks crypto recommendations", () => {
    const result = filterLlmOutput("Invest in Bitcoin crypto now.");
    expect(result.triggered).toBe(true);
  });

  it("blocks self-harm language", () => {
    const result = filterLlmOutput("Feeling low? self-harm thoughts are common.");
    expect(result.triggered).toBe(true);
  });

  it("returns safe fallback text when triggered", () => {
    const result = filterLlmOutput("stop eating carbs.");
    expect(result.content).toBe("Focus on consistency today — small steps compound.");
  });

  it("does not trigger on normal financial advice", () => {
    const result = filterLlmOutput("Review your monthly subscriptions to cut costs.");
    expect(result.triggered).toBe(false);
  });

  it("does not trigger on health encouragement without thresholds", () => {
    const result = filterLlmOutput("Aim for 8 hours of sleep tonight.");
    expect(result.triggered).toBe(false);
  });
});
