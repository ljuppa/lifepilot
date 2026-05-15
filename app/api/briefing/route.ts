import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("briefings")
    .select("id, briefing_date, content, email_status, helpful, safety_filter_triggered, created_at")
    .eq("user_id", user.id)
    .gte("briefing_date", cutoff)
    .order("briefing_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch briefings." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
