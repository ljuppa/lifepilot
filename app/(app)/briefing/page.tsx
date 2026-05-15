import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";
import { isValidContent } from "@/lib/briefing/content";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  delivered: { label: "Delivered", cls: "text-green-700 bg-green-50 border border-green-200" },
  pending:   { label: "Pending",   cls: "text-amber-700 bg-amber-50 border border-amber-200" },
  failed:    { label: "Failed",    cls: "text-red-700 bg-red-50 border border-red-200" },
};

function EmailStatusBadge({ status }: { status: string }) {
  const { label, cls } = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr ?? "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export default async function BriefingHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, briefing_time")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: briefings } = await supabase
    .from("briefings")
    .select("id, briefing_date, content, email_status, helpful")
    .eq("user_id", user.id)
    .gte("briefing_date", cutoff)
    .order("briefing_date", { ascending: false });

  const list = briefings ?? [];

  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-2">
      {list.length === 0 ? (
        <CoachVoiceLine variant="empty">
          Your briefing history will appear here. Check back after your first briefing.
        </CoachVoiceLine>
      ) : (
        list.map((b) => (
          <Link
            key={b.id}
            href={`/briefing/${b.id}`}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:bg-muted/40 transition-colors"
          >
            <div className="space-y-0.5 min-w-0 mr-3">
              <p className="text-sm font-medium text-foreground">{formatDate(b.briefing_date)}</p>
              <p className="text-sm text-muted-foreground truncate">
                {isValidContent(b.content) ? b.content.greeting.slice(0, 100) : "—"}
              </p>
            </div>
            <EmailStatusBadge status={b.email_status ?? "pending"} />
          </Link>
        ))
      )}
    </div>
  );
}
