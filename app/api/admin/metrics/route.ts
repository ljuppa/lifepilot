import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify admin role before any DB queries
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required." } },
      { status: 403 }
    );
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayDateStr = todayStart.toISOString().slice(0, 10);

  // DAU: distinct user_ids who checked in today
  const { data: todayCheckins } = await adminClient
    .from("checkins")
    .select("user_id")
    .gte("checked_in_at", todayStart.toISOString());
  const dau = new Set((todayCheckins ?? []).map((r: { user_id: string }) => r.user_id)).size;

  // Total users
  const { count: totalUsers } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Briefing delivery rate today
  const { count: totalBriefings } = await adminClient
    .from("briefings")
    .select("*", { count: "exact", head: true })
    .eq("briefing_date", todayDateStr);

  const { count: deliveredBriefings } = await adminClient
    .from("briefings")
    .select("*", { count: "exact", head: true })
    .eq("briefing_date", todayDateStr)
    .eq("email_status", "delivered");

  const briefingDeliveryRate =
    (totalBriefings ?? 0) > 0
      ? Math.round(((deliveredBriefings ?? 0) / totalBriefings!) * 100)
      : 0;

  const checkinRate =
    (totalUsers ?? 0) > 0 ? Math.round((dau / totalUsers!) * 100) : 0;

  console.log(
    JSON.stringify({ event: "admin_metrics_fetched", dau, briefingDeliveryRate, checkinRate, totalUsers })
  );

  return NextResponse.json({ data: { dau, briefingDeliveryRate, checkinRate, totalUsers } });
}
