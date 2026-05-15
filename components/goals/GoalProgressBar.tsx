interface GoalProgressBarProps {
  progressPercent: number | null;
  progressLabel: string | null;
}

export function GoalProgressBar({ progressPercent, progressLabel }: GoalProgressBarProps) {
  if (progressPercent === null) {
    return <p className="text-sm text-muted-foreground">No data yet</p>;
  }

  const fillWidth = Math.min(progressPercent, 100);

  return (
    <div className="space-y-1">
      {progressLabel && (
        <p className="text-xs text-muted-foreground">{progressLabel}</p>
      )}
      <div className="h-2 w-full rounded-full bg-muted" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-2 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${fillWidth}%` }}
        />
      </div>
    </div>
  );
}
