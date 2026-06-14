export default function AdminUsersLoading() {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">User lookup</p>
      <div className="mb-8">
        <div className="h-10 w-full max-w-sm bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6 animate-pulse">
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-card p-6 animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
