import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachVoiceLine } from "../coach-voice-line";

describe("CoachVoiceLine", () => {
  it("renders children text", () => {
    render(<CoachVoiceLine>Hello from your coach.</CoachVoiceLine>);
    expect(screen.getByText("Hello from your coach.")).toBeInTheDocument();
  });

  it("applies italic serif style by default", () => {
    render(<CoachVoiceLine>Test</CoachVoiceLine>);
    const el = screen.getByText("Test");
    expect(el.className).toMatch(/italic/);
    expect(el.className).toMatch(/font-serif/);
  });

  it("applies text-center for closing variant", () => {
    render(<CoachVoiceLine variant="closing">Done</CoachVoiceLine>);
    expect(screen.getByText("Done").className).toMatch(/text-center/);
  });

  it("applies muted style for empty variant", () => {
    render(<CoachVoiceLine variant="empty">No goals yet</CoachVoiceLine>);
    expect(screen.getByText("No goals yet").className).toMatch(/text-muted-foreground/);
  });
});
