import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklySummary, type WeeklySummaryData } from "../WeeklySummary";

const baseSummary: WeeklySummaryData = {
  daysCheckedInThisWeek: 4,
  briefingsThisWeek: 3,
  domainAverages: { health: 7.5, finance: 400, wellness: 8.0 },
};

describe("WeeklySummary", () => {
  it("shows skeleton when isLoading is true", () => {
    const { container } = render(
      <WeeklySummary summary={null} activeDomains={new Set()} isLoading={true} />
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText(/this week/i)).not.toBeInTheDocument();
  });

  it("shows 'No check-ins yet this week' when daysCheckedInThisWeek is 0", () => {
    render(
      <WeeklySummary
        summary={{ ...baseSummary, daysCheckedInThisWeek: 0 }}
        activeDomains={new Set(["health"])}
        isLoading={false}
      />
    );
    expect(screen.getByText("No check-ins yet this week")).toBeInTheDocument();
  });

  it("shows nudge CoachVoiceLine when check-ins < 3", () => {
    render(
      <WeeklySummary
        summary={{ ...baseSummary, daysCheckedInThisWeek: 2 }}
        activeDomains={new Set(["health"])}
        isLoading={false}
      />
    );
    expect(screen.getByText(/check in more often/i)).toBeInTheDocument();
  });

  it("shows days counter and briefings count in normal state", () => {
    render(
      <WeeklySummary
        summary={baseSummary}
        activeDomains={new Set(["health"])}
        isLoading={false}
      />
    );
    expect(screen.getByText("4 / 7")).toBeInTheDocument();
    expect(screen.getByText(/days checked in/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/briefings received/i)).toBeInTheDocument();
  });

  it("shows only domain averages for activeDomains", () => {
    render(
      <WeeklySummary
        summary={baseSummary}
        activeDomains={new Set(["health"])}
        isLoading={false}
      />
    );
    expect(screen.getByText(/health avg/i)).toBeInTheDocument();
    expect(screen.queryByText(/finance avg/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/wellness avg/i)).not.toBeInTheDocument();
  });

  it("shows all three domain averages when all domains are active", () => {
    render(
      <WeeklySummary
        summary={baseSummary}
        activeDomains={new Set(["health", "finance", "wellness"])}
        isLoading={false}
      />
    );
    expect(screen.getByText(/health avg/i)).toBeInTheDocument();
    expect(screen.getByText(/finance avg/i)).toBeInTheDocument();
    expect(screen.getByText(/wellness avg/i)).toBeInTheDocument();
  });
});
