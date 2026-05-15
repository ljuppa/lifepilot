import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

export interface WeeklySummaryData {
  daysCheckedInThisWeek: number;
  briefingsThisWeek: number;
  domainAverages: {
    health: number | null;
    finance: number | null;
    wellness: number | null;
  };
}

interface WeeklySummaryProps {
  summary: WeeklySummaryData | null;
  activeDomains: Set<string>;
  isLoading: boolean;
}

export function WeeklySummary({ summary, activeDomains, isLoading }: WeeklySummaryProps) {
  if (isLoading || summary === null) {
    return (
      <div className="space-y-2 animate-pulse" aria-hidden="true">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
        <div className="h-3 w-40 rounded bg-muted" />
      </div>
    );
  }

  const { daysCheckedInThisWeek, briefingsThisWeek, domainAverages } = summary;

  return (
    <section aria-label="This week" className="space-y-3">
      <h2 className="text-base font-medium">This week</h2>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          <span className="font-medium text-foreground">{daysCheckedInThisWeek} / 7</span> days checked in
        </p>
        <p>
          <span className="font-medium text-foreground">{briefingsThisWeek}</span>{" "}
          {briefingsThisWeek === 1 ? "briefing" : "briefings"} received
        </p>
      </div>

      {daysCheckedInThisWeek === 0 ? (
        <CoachVoiceLine variant="empty">No check-ins yet this week</CoachVoiceLine>
      ) : daysCheckedInThisWeek < 3 ? (
        <CoachVoiceLine variant="observation">
          Check in more often to see your weekly trends.
        </CoachVoiceLine>
      ) : (
        <div className="space-y-1 text-sm text-muted-foreground">
          {activeDomains.has("health") && domainAverages.health !== null && (
            <p>Health avg: <span className="font-medium text-foreground">{domainAverages.health.toFixed(1)}</span></p>
          )}
          {activeDomains.has("finance") && domainAverages.finance !== null && (
            <p>Finance avg: <span className="font-medium text-foreground">${domainAverages.finance.toFixed(0)}</span></p>
          )}
          {activeDomains.has("wellness") && domainAverages.wellness !== null && (
            <p>Wellness avg: <span className="font-medium text-foreground">{domainAverages.wellness.toFixed(1)} hrs</span></p>
          )}
        </div>
      )}
    </section>
  );
}
