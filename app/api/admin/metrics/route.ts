import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAdminMetrics } from "@/lib/admin/getMetrics";

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "Server configuration error" } },
      { status: 500 }
    );
  }

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
    serviceRoleKey
  );

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(JSON.stringify({ event: "admin_role_check_error", code: profileError.code }));
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to verify authorization" } },
      { status: 500 }
    );
  }

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required." } },
      { status: 403 }
    );
  }

  try {
    const metrics = await getAdminMetrics();
    console.log(JSON.stringify({ event: "admin_metrics_fetched", ...metrics }));
    return NextResponse.json({ data: metrics });
  } catch (err) {
    console.error(JSON.stringify({ event: "admin_metrics_error", message: (err as Error).message }));
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch metrics" } },
      { status: 500 }
    );
  }
}
