import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalProgressBar } from "../GoalProgressBar";

describe("GoalProgressBar", () => {
  it("renders 'No data yet' when progressPercent is null", () => {
    render(<GoalProgressBar progressPercent={null} progressLabel={null} />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });

  it("renders progress bar when progressPercent is provided", () => {
    render(<GoalProgressBar progressPercent={60} progressLabel="6.0 hrs avg" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders progress label text", () => {
    render(<GoalProgressBar progressPercent={75} progressLabel="75 / 100" />);
    expect(screen.getByText("75 / 100")).toBeInTheDocument();
  });

  it("caps visual fill at 100% even when progressPercent > 100", () => {
    const { container } = render(
      <GoalProgressBar progressPercent={130} progressLabel="$1,300 / $1,000" />
    );
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill?.style.width).toBe("100%");
  });

  it("aria-valuenow reflects actual percent (not capped)", () => {
    render(<GoalProgressBar progressPercent={130} progressLabel="over budget" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "130");
  });

  it("renders 0% fill bar for zero progress", () => {
    const { container } = render(
      <GoalProgressBar progressPercent={0} progressLabel="0 / 100" />
    );
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill?.style.width).toBe("0%");
  });
});
