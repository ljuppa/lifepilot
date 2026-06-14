import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type AdminMetrics = {
  dau: number;
  briefingDeliveryRate: number;
  checkinRate: number;
  totalUsers: number;
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayDateStr = todayStart.toISOString().slice(0, 10);

  const { data: dauResult, error: dauError } = await adminClient.rpc("get_dau", {
    today_start: todayStart.toISOString(),
  });
  if (dauError) throw new Error(`DAU query failed: ${dauError.message}`);
  const dau = Number(dauResult ?? 0);

  const { count: totalUsers, error: usersError } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true });
  if (usersError) throw new Error(`totalUsers query failed: ${usersError.message}`);

  const { count: totalBriefings, error: briefingsError } = await adminClient
    .from("briefings")
    .select("*", { count: "exact", head: true })
    .eq("briefing_date", todayDateStr);
  if (briefingsError) throw new Error(`totalBriefings query failed: ${briefingsError.message}`);

  const { count: deliveredBriefings, error: deliveredError } = await adminClient
    .from("briefings")
    .select("*", { count: "exact", head: true })
    .eq("briefing_date", todayDateStr)
    .eq("email_status", "delivered");
  if (deliveredError) throw new Error(`deliveredBriefings query failed: ${deliveredError.message}`);

  const briefingDeliveryRate =
    (totalBriefings ?? 0) > 0
      ? Math.min(Math.round(((deliveredBriefings ?? 0) / totalBriefings!) * 100), 100)
      : 0;

  const checkinRate =
    (totalUsers ?? 0) > 0 ? Math.round((dau / totalUsers!) * 100) : 0;

  return { dau, briefingDeliveryRate, checkinRate, totalUsers: totalUsers ?? 0 };
}
