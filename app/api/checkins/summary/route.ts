import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface DomainAverages {
  health: number | null;
  finance: number | null;
  wellness: number | null;
}

function getWeekBoundaries(now: Date): { weekStart: string; weekEnd: string } {
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return {
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  };
}

function computeAvg(
  rows: { health_metric?: number | null; finance_metric?: number | null; wellness_metric?: number | null }[],
  key: "health_metric" | "finance_metric" | "wellness_metric"
): number | null {
  const values = rows.map((r) => r[key]).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const now = new Date();
  const { weekStart, weekEnd } = getWeekBoundaries(now);

  // Days checked in this week (distinct calendar days)
  const { data: checkinRows } = await supabase
    .from("checkins")
    .select("checked_in_at")
    .eq("user_id", user.id)
    .gte("checked_in_at", weekStart)
    .lte("checked_in_at", weekEnd);

  const daysCheckedInThisWeek = new Set(
    (checkinRows ?? []).map((r) => (r.checked_in_at as string).slice(0, 10))
  ).size;

  // Briefings received this week
  const { count: briefingsCount } = await supabase
    .from("briefings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", weekStart)
    .lte("created_at", weekEnd);

  const briefingsThisWeek = briefingsCount ?? 0;

  // 7-day rolling domain averages
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const { data: metricRows } = await supabase
    .from("checkins")
    .select("health_metric, finance_metric, wellness_metric")
    .eq("user_id", user.id)
    .gte("checked_in_at", sevenDaysAgo.toISOString());

  const rows = metricRows ?? [];
  const domainAverages: DomainAverages = {
    health: computeAvg(rows, "health_metric"),
    finance: computeAvg(rows, "finance_metric"),
    wellness: computeAvg(rows, "wellness_metric"),
  };

  return NextResponse.json({
    data: { daysCheckedInThisWeek, briefingsThisWeek, domainAverages },
  });
}
