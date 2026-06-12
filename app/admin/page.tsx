import { headers } from "next/headers";

type Metrics = {
  dau: number;
  briefingDeliveryRate: number;
  checkinRate: number;
  totalUsers: number;
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default async function AdminPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${protocol}://${host}/api/admin/metrics`, {
    headers: { cookie: headersList.get("cookie") ?? "" },
    cache: "no-store",
  });

  const json = await res.json() as { data?: Metrics };
  const metrics: Metrics = json.data ?? {
    dau: 0,
    briefingDeliveryRate: 0,
    checkinRate: 0,
    totalUsers: 0,
  };

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
