import BroadcastForm from "./BroadcastForm";

export default function AdminBroadcastPage() {
  return (
    <div className="max-w-lg">
      <p className="text-sm text-muted-foreground mb-6">
        Send a one-time email to all users who have opted in to platform announcements.
      </p>
      <BroadcastForm />
    </div>
  );
}
