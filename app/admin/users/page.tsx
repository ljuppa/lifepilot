import { getAdminUserData } from "@/lib/admin/getUserData";
import type { AdminUserData } from "@/lib/admin/getUserData";

interface Props {
  searchParams: Promise<{ userId?: string }>;
}

function StatusBadge({ status }: { status: string }) {
  const isGood = status === "verified" || status === "delivered";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isGood ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function UserResults({ data }: { data: AdminUserData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Account status" value={data.accountStatus} />
        <StatCard label="Profile complete" value={data.profileComplete ? "Yes" : "No"} />
        <StatCard label="Briefings (last 10)" value={String(data.briefings.length)} />
        <StatCard label="Re-engagements (last 5)" value={String(data.reengagementNotifications.length)} />
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Recent briefings</h2>
        {data.briefings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No briefings found.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.briefings.map((b, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 tabular-nums">{b.briefing_date}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={b.email_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Re-engagement notifications</h2>
        {data.reengagementNotifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No re-engagement notifications found.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Sent at</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.reengagementNotifications.map((n, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 tabular-nums">{new Date(n.sent_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={n.email_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const userId = params.userId?.trim();

  let result: Awaited<ReturnType<typeof getAdminUserData>> | null = null;
  if (userId) {
    result = await getAdminUserData(userId);
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">User lookup</p>

      <form method="GET" action="/admin/users" className="mb-8 flex gap-2 max-w-sm">
        <input
          type="text"
          name="userId"
          defaultValue={userId ?? ""}
          placeholder="User UUID"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="User UUID"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Look up
        </button>
      </form>

      {result === null && (
        <p className="text-sm text-muted-foreground">Enter a user UUID above to look up their delivery history.</p>
      )}

      {result !== null && !result.ok && result.code === "NOT_FOUND" && (
        <p className="text-sm text-destructive">User not found.</p>
      )}

      {result !== null && !result.ok && result.code === "VALIDATION_ERROR" && (
        <p className="text-sm text-destructive">Invalid UUID format. Please enter a valid user UUID.</p>
      )}

      {result !== null && !result.ok && result.code !== "NOT_FOUND" && result.code !== "VALIDATION_ERROR" && (
        <p className="text-sm text-destructive">Failed to load user data. Please try again.</p>
      )}

      {result !== null && result.ok && <UserResults data={result.data} />}
    </div>
  );
}
