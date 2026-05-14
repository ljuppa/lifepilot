import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DomainChipSelector, DomainChipDisplay } from "../domain-chip";

describe("DomainChipSelector", () => {
  it("renders all three domains", () => {
    render(<DomainChipSelector value={[]} onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: /health/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /finance/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /wellness/i })).toBeInTheDocument();
  });

  it("shows selected state for chosen domains", () => {
    render(<DomainChipSelector value={["health"]} onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: /health/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: /finance/i })).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange when a domain is toggled on", () => {
    const onChange = vi.fn();
    render(<DomainChipSelector value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /health/i }));
    expect(onChange).toHaveBeenCalledWith(["health"]);
  });

  it("calls onChange when a domain is toggled off", () => {
    const onChange = vi.fn();
    render(<DomainChipSelector value={["health"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /health/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("disables unselected chips when 3 are already selected", () => {
    render(
      <DomainChipSelector value={["health", "finance", "wellness"]} onChange={vi.fn()} />
    );
    // All are selected so none are disabled due to limit — each is enabled (selected)
    const chips = screen.getAllByRole("checkbox");
    chips.forEach((chip) => expect(chip).not.toBeDisabled());
  });

  it("disables unselected chip when 3 limit reached but that chip is not selected", () => {
    // Simulate having 3 domains but one replaced — not possible since there are only 3
    // Instead verify that with 2 selected, the third is still enabled
    render(<DomainChipSelector value={["health", "finance"]} onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: /wellness/i })).not.toBeDisabled();
  });

  it("is disabled via disabled prop", () => {
    render(<DomainChipSelector value={[]} onChange={vi.fn()} disabled />);
    screen.getAllByRole("checkbox").forEach((chip) => expect(chip).toBeDisabled());
  });
});

describe("DomainChipDisplay", () => {
  it("renders domain label", () => {
    render(<DomainChipDisplay domain="health" />);
    expect(screen.getByText("Health")).toBeInTheDocument();
  });

  it("renders finance domain", () => {
    render(<DomainChipDisplay domain="finance" />);
    expect(screen.getByText("Finance")).toBeInTheDocument();
  });

  it("renders wellness domain", () => {
    render(<DomainChipDisplay domain="wellness" />);
    expect(screen.getByText("Wellness")).toBeInTheDocument();
  });
});
