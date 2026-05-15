import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BriefingCard } from "./BriefingCard";

describe("BriefingCard — greeting variant", () => {
  it("renders the greeting body text", () => {
    render(<BriefingCard variant="greeting" body="Good morning, Alice." />);
    expect(screen.getByText("Good morning, Alice.")).toBeInTheDocument();
  });

  it("has role=article and aria-label for greeting", () => {
    render(<BriefingCard variant="greeting" body="Hello." />);
    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("aria-label", "Daily greeting");
  });

  it("does not render a domain badge", () => {
    render(<BriefingCard variant="greeting" body="Hello." />);
    expect(screen.queryByText(/Health|Finance|Wellness/)).toBeNull();
  });
});

describe("BriefingCard — suggestion variant", () => {
  it("renders the suggestion body", () => {
    render(
      <BriefingCard variant="suggestion" domain="health" body="Walk 30 minutes today." />
    );
    expect(screen.getByText("Walk 30 minutes today.")).toBeInTheDocument();
  });

  it("renders the domain badge", () => {
    render(
      <BriefingCard variant="suggestion" domain="health" body="Walk 30 min." />
    );
    expect(screen.getByText("Health")).toBeInTheDocument();
  });

  it("has role=article and domain aria-label", () => {
    render(
      <BriefingCard variant="suggestion" domain="finance" body="Check your budget." />
    );
    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("aria-label", "finance suggestion");
  });

  it("renders action link when provided", () => {
    render(
      <BriefingCard
        variant="suggestion"
        domain="wellness"
        body="Meditate."
        actionLinkText="Start session"
        actionLinkUrl="/checkin"
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/checkin");
    expect(link.textContent).toContain("Start session");
  });

  it("does not render action link when not provided", () => {
    render(
      <BriefingCard variant="suggestion" domain="health" body="Walk." />
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("does not render action link when text or url is null", () => {
    render(
      <BriefingCard
        variant="suggestion"
        domain="health"
        body="Walk."
        actionLinkText={null}
        actionLinkUrl={null}
      />
    );
    expect(screen.queryByRole("link")).toBeNull();
  });
});
