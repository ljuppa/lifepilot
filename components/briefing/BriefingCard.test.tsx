import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("action link has target=_blank and rel=noopener noreferrer", () => {
    render(
      <BriefingCard
        variant="suggestion"
        domain="health"
        body="Walk."
        actionLinkText="Learn more"
        actionLinkUrl="https://example.com"
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
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

describe("BriefingCard — helpfulness feedback", () => {
  it("shows feedback buttons when onFeedback is provided", () => {
    render(
      <BriefingCard
        variant="suggestion"
        domain="health"
        body="Walk."
        onFeedback={vi.fn()}
        helpful={null}
      />
    );
    expect(screen.getByRole("button", { name: "Mark as helpful" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as not helpful" })).toBeInTheDocument();
  });

  it("does not show feedback buttons when onFeedback is not provided", () => {
    render(<BriefingCard variant="suggestion" domain="health" body="Walk." />);
    expect(screen.queryByRole("button", { name: "Mark as helpful" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark as not helpful" })).toBeNull();
  });

  it("does not show feedback buttons on greeting variant even with onFeedback", () => {
    render(<BriefingCard variant="greeting" body="Hello." />);
    expect(screen.queryByRole("button", { name: "Mark as helpful" })).toBeNull();
  });

  it("calls onFeedback(true) when thumbs-up is clicked", async () => {
    const onFeedback = vi.fn();
    render(
      <BriefingCard
        variant="suggestion"
        domain="health"
        body="Walk."
        onFeedback={onFeedback}
        helpful={null}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Mark as helpful" }));
    expect(onFeedback).toHaveBeenCalledWith(true);
    expect(onFeedback).toHaveBeenCalledTimes(1);
  });

  it("calls onFeedback(false) when thumbs-down is clicked", async () => {
    const onFeedback = vi.fn();
    render(
      <BriefingCard
        variant="suggestion"
        domain="health"
        body="Walk."
        onFeedback={onFeedback}
        helpful={null}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Mark as not helpful" }));
    expect(onFeedback).toHaveBeenCalledWith(false);
  });

  it("sets aria-pressed=true on thumbs-up when helpful=true", () => {
    render(
      <BriefingCard
        variant="suggestion"
        domain="health"
        body="Walk."
        onFeedback={vi.fn()}
        helpful={true}
      />
    );
    expect(screen.getByRole("button", { name: "Mark as helpful" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mark as not helpful" })).toHaveAttribute("aria-pressed", "false");
  });

  it("sets aria-pressed=true on thumbs-down when helpful=false", () => {
    render(
      <BriefingCard
        variant="suggestion"
        domain="health"
        body="Walk."
        onFeedback={vi.fn()}
        helpful={false}
      />
    );
    expect(screen.getByRole("button", { name: "Mark as helpful" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Mark as not helpful" })).toHaveAttribute("aria-pressed", "true");
  });

  it("both buttons aria-pressed=false when helpful=null", () => {
    render(
      <BriefingCard
        variant="suggestion"
        domain="health"
        body="Walk."
        onFeedback={vi.fn()}
        helpful={null}
      />
    );
    expect(screen.getByRole("button", { name: "Mark as helpful" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Mark as not helpful" })).toHaveAttribute("aria-pressed", "false");
  });

  it("feedback buttons have min-w and min-h 44px touch target classes", () => {
    render(
      <BriefingCard
        variant="suggestion"
        domain="health"
        body="Walk."
        onFeedback={vi.fn()}
        helpful={null}
      />
    );
    const helpfulBtn = screen.getByRole("button", { name: "Mark as helpful" });
    expect(helpfulBtn.className).toContain("min-w-[44px]");
    expect(helpfulBtn.className).toContain("min-h-[44px]");
  });
});
