import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { StreakBadge } from "../StreakBadge";

// jsdom doesn't implement matchMedia — define a stub so spyOn can work
beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
  }
});

afterEach(() => vi.restoreAllMocks());

describe("StreakBadge", () => {
  it("shows 'Start your streak' when streakDays is 0", () => {
    render(<StreakBadge streakDays={0} />);
    expect(screen.getByText("Start your streak")).toBeInTheDocument();
  });

  it("renders streak count and label for non-zero streak", () => {
    render(<StreakBadge streakDays={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("day streak")).toBeInTheDocument();
  });

  it("does not show 'Start your streak' for non-zero streak", () => {
    render(<StreakBadge streakDays={3} />);
    expect(screen.queryByText("Start your streak")).toBeNull();
  });

  it("adds animate-pulse on mount for milestone 7", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    const { container } = render(<StreakBadge streakDays={7} />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("animate-pulse");
  });

  it("removes animate-pulse after 1500ms for milestone", async () => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    const { container } = render(<StreakBadge streakDays={30} />);
    expect(container.querySelector("span")?.className).toContain("animate-pulse");

    await act(async () => { vi.advanceTimersByTime(1600); });

    expect(container.querySelector("span")?.className).not.toContain("animate-pulse");
    vi.useRealTimers();
  });

  it("skips animate-pulse when prefers-reduced-motion is set", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    const { container } = render(<StreakBadge streakDays={100} />);
    expect(container.querySelector("span")?.className).not.toContain("animate-pulse");
  });

  it("does not animate for non-milestone streaks", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    const { container } = render(<StreakBadge streakDays={5} />);
    expect(container.querySelector("span")?.className).not.toContain("animate-pulse");
  });
});
