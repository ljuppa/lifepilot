export function BriefingCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl border border-border bg-coach-observation p-6 space-y-3"
    >
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-5/6 rounded bg-muted" />
      <div className="h-4 w-4/6 rounded bg-muted" />
    </div>
  );
}
