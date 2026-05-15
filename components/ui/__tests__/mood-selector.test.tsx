import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MoodSelector } from "../mood-selector";

describe("MoodSelector", () => {
  it("renders 5 mood buttons", () => {
    render(<MoodSelector value={null} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole("radio");
    expect(buttons).toHaveLength(5);
  });

  it("has role=radiogroup with correct label", () => {
    render(<MoodSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: /how are you feeling today/i })).toBeInTheDocument();
  });

  it("each button is labelled 'Mood N of 5'", () => {
    render(<MoodSelector value={null} onChange={vi.fn()} />);
    for (let n = 1; n <= 5; n++) {
      expect(screen.getByRole("radio", { name: `Mood ${n} of 5` })).toBeInTheDocument();
    }
  });

  it("calls onChange with correct value on click", () => {
    const onChange = vi.fn();
    render(<MoodSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Mood 3 of 5" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("marks selected mood as aria-checked", () => {
    render(<MoodSelector value={2} onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Mood 2 of 5" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Mood 1 of 5" })).toHaveAttribute("aria-checked", "false");
  });

  it("navigates right with ArrowRight key", () => {
    const onChange = vi.fn();
    render(<MoodSelector value={2} onChange={onChange} />);
    const mood2 = screen.getByRole("radio", { name: "Mood 2 of 5" });
    fireEvent.keyDown(mood2, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("navigates left with ArrowLeft key", () => {
    const onChange = vi.fn();
    render(<MoodSelector value={3} onChange={onChange} />);
    const mood3 = screen.getByRole("radio", { name: "Mood 3 of 5" });
    fireEvent.keyDown(mood3, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
