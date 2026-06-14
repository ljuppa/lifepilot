import { getAdminMetrics } from "@/lib/admin/getMetrics";
import type { AdminMetrics } from "@/lib/admin/getMetrics";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default async function AdminPage() {
  let metrics: AdminMetrics;
  try {
    metrics = await getAdminMetrics();
  } catch {
    metrics = { dau: 0, briefingDeliveryRate: 0, checkinRate: 0, totalUsers: 0 };
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">Platform metrics</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="DAU" value={metrics.dau} />
        <StatCard label="Briefing delivery rate" value={`${metrics.briefingDeliveryRate}%`} />
        <StatCard label="Check-in rate" value={`${metrics.checkinRate}%`} />
        <StatCard label="Total users" value={metrics.totalUsers} />
      </div>
    </div>
  );
}
