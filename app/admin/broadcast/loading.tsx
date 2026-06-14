export default function AdminBroadcastLoading() {
  return (
    <div className="max-w-lg animate-pulse">
      <div className="h-4 w-72 bg-muted rounded mb-6" />
      <div className="space-y-6">
        <div className="space-y-1.5">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded-md" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-40 w-full bg-muted rounded-md" />
        </div>
        <div className="h-9 w-32 bg-muted rounded-md" />
      </div>
    </div>
  );
}
