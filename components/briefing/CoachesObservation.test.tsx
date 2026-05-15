import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachesObservation } from "./CoachesObservation";

describe("CoachesObservation", () => {
  it("renders the observation body text", () => {
    render(<CoachesObservation body="You've been consistent — what's driving that?" />);
    expect(screen.getByText("You've been consistent — what's driving that?")).toBeInTheDocument();
  });

  it("shows the Coach's Observation label", () => {
    render(<CoachesObservation body="Some text." />);
    expect(screen.getByText("Coach's Observation")).toBeInTheDocument();
  });

  it("has role=note", () => {
    render(<CoachesObservation body="Some text." />);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("has aria-label=Coach's Observation", () => {
    render(<CoachesObservation body="Some text." />);
    expect(screen.getByRole("note")).toHaveAttribute("aria-label", "Coach's Observation");
  });

  it("has no CTA button or feedback icon", () => {
    render(<CoachesObservation body="Some text." />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
