import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AdminUserLookupSchema } from "@/lib/validation/admin";

export async function GET(req: NextRequest) {
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

  // P5 patch: validate UUID before admin role DB query (AC2: no DB query for invalid input)
  const { searchParams } = new URL(req.url);
  const parsed = AdminUserLookupSchema.safeParse({ userId: searchParams.get("userId") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }
  const { userId } = parsed.data;

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

  // P4 patch: distinguish auth service errors from genuine "user not found"
  const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(userId);
  if (authUserError) {
    console.error(JSON.stringify({ event: "admin_user_lookup_auth_error", message: authUserError.message }));
    return NextResponse.json(
      { error: { code: "AUTH_ERROR", message: "Failed to fetch user from Auth service" } },
      { status: 502 }
    );
  }
  if (!authUser?.user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "User not found" } },
      { status: 404 }
    );
  }

  const [briefingsResult, reengagementResult, profileResult] = await Promise.all([
    adminClient
      .from("briefings")
      .select("briefing_date, email_status")
      .eq("user_id", userId)
      .order("briefing_date", { ascending: false })
      .limit(10),
    adminClient
      .from("reengagement_notifications")
      .select("sent_at, email_status")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(5),
    adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  // P1 patch: check all three query errors, not just briefingsResult
  if (briefingsResult.error || reengagementResult.error || profileResult.error) {
    const errMsg =
      briefingsResult.error?.message ??
      reengagementResult.error?.message ??
      profileResult.error?.message ??
      "Unknown DB error";
    console.error(JSON.stringify({ event: "admin_user_lookup_error", message: errMsg }));
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch user data" } },
      { status: 500 }
    );
  }

  adminClient
    .from("audit_logs")
    .insert({ user_id: user.id, event_type: "admin_user_lookup", metadata: { target_user_id: userId } })
    .then(({ error }: { error: { code: string } | null }) => {
      if (error) console.error(JSON.stringify({ event: "audit_log_error", code: error.code }));
    })
    .catch((err: Error) => {
      console.error(JSON.stringify({ event: "audit_log_error", message: err.message }));
    });

  const accountStatus = authUser.user.email_confirmed_at ? "verified" : "unverified";
  const profileComplete = !!profileResult.data;

  console.log(JSON.stringify({
    event: "admin_user_lookup_success",
    accountStatus,
    briefingCount: briefingsResult.data?.length ?? 0,
    reengagementCount: reengagementResult.data?.length ?? 0,
    profileComplete,
  }));

  return NextResponse.json({
    data: {
      accountStatus,
      briefings: briefingsResult.data ?? [],
      reengagementNotifications: reengagementResult.data ?? [],
      profileComplete,
    },
  });
}
