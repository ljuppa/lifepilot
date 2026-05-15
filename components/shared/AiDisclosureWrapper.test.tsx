import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiDisclosureWrapper } from "./AiDisclosureWrapper";

describe("AiDisclosureWrapper", () => {
  it("renders children", () => {
    render(<AiDisclosureWrapper><div>My briefing content</div></AiDisclosureWrapper>);
    expect(screen.getByText("My briefing content")).toBeInTheDocument();
  });

  it("shows the AI disclosure footer text", () => {
    render(<AiDisclosureWrapper><div>X</div></AiDisclosureWrapper>);
    expect(screen.getByText(/AI-generated/)).toBeInTheDocument();
    expect(screen.getByText(/not medical/)).toBeInTheDocument();
    expect(screen.getByText(/not medical, nutritional, or financial advice/)).toBeInTheDocument();
  });

  it("has no dismiss or close button", () => {
    render(<AiDisclosureWrapper><div>X</div></AiDisclosureWrapper>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("disclosure text contains the ✦ symbol", () => {
    render(<AiDisclosureWrapper><div>X</div></AiDisclosureWrapper>);
    expect(screen.getByText(/✦/)).toBeInTheDocument();
  });
});
