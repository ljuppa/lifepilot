import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DISPLAYED_PERCENT = 150;

function computeStreak(
  checkinDates: string[],
  todayUtc: string
): number {
  if (checkinDates.length === 0) return 0;

  const dateSet = new Set(checkinDates);
  const hasToday = dateSet.has(todayUtc);

  let streak = 0;
  const cursor = new Date(todayUtc + "T00:00:00Z");

  if (!hasToday) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!dateSet.has(dateStr)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function buildProgressLabel(
  domain: string,
  currentValue: number,
  targetValue: number
): string {
  if (domain === "finance") {
    return `$${currentValue.toFixed(0)} / $${targetValue.toFixed(0)}`;
  }
  if (domain === "wellness") {
    return `${currentValue.toFixed(1)} / ${targetValue.toFixed(1)} hrs avg`;
  }
  return `${currentValue.toFixed(1)} / ${targetValue.toFixed(1)}`;
}

export async function GET(_request: Request, { params }: Params) {
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

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Goal not found" } },
      { status: 404 }
    );
  }

  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("id, domain, target_value, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (goalError || !goal) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Goal not found" } },
      { status: 404 }
    );
  }

  // Streak: fetch all check-in dates for this user
  const { data: checkinRows } = await supabase
    .from("checkins")
    .select("checked_in_at")
    .eq("user_id", user.id)
    .order("checked_in_at", { ascending: false });

  const checkinDates = (checkinRows ?? []).map((r) =>
    (r.checked_in_at as string).slice(0, 10)
  );
  const todayUtc = new Date().toISOString().slice(0, 10);
  const streakDays = computeStreak(checkinDates, todayUtc);

  // Domain-specific progress
  const targetValue = goal.target_value as number | null;

  if (targetValue === null) {
    return NextResponse.json({
      data: { streakDays, progressPercent: null, progressLabel: null, currentValue: null },
    });
  }

  let currentValue: number | null = null;

  if (goal.domain === "health") {
    const { data: latest } = await supabase
      .from("checkins")
      .select("health_metric")
      .eq("user_id", user.id)
      .not("health_metric", "is", null)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    currentValue = (latest?.health_metric as number | null) ?? null;
  } else if (goal.domain === "finance") {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: rows } = await supabase
      .from("checkins")
      .select("finance_metric")
      .eq("user_id", user.id)
      .gte("checked_in_at", monthStart.toISOString())
      .not("finance_metric", "is", null);
    if (rows && rows.length > 0) {
      currentValue = (rows as { finance_metric: number }[]).reduce(
        (sum, r) => sum + r.finance_metric,
        0
      );
    }
  } else if (goal.domain === "wellness") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const { data: rows } = await supabase
      .from("checkins")
      .select("wellness_metric")
      .eq("user_id", user.id)
      .gte("checked_in_at", sevenDaysAgo.toISOString())
      .not("wellness_metric", "is", null);
    if (rows && rows.length > 0) {
      const avg =
        (rows as { wellness_metric: number }[]).reduce(
          (sum, r) => sum + r.wellness_metric,
          0
        ) / rows.length;
      currentValue = avg;
    }
  }

  if (currentValue === null) {
    return NextResponse.json({
      data: { streakDays, progressPercent: null, progressLabel: null, currentValue: null },
    });
  }

  const rawPercent = (currentValue / targetValue) * 100;
  const progressPercent = Math.min(Math.round(rawPercent), MAX_DISPLAYED_PERCENT);
  const progressLabel = buildProgressLabel(goal.domain as string, currentValue, targetValue);

  return NextResponse.json({
    data: { streakDays, progressPercent, progressLabel, currentValue },
  });
}
