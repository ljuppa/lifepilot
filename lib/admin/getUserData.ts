import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AdminUserLookupSchema } from "@/lib/validation/admin";

export type BriefingRecord = {
  briefing_date: string;
  email_status: string;
};

export type ReengagementRecord = {
  sent_at: string;
  email_status: string;
};

export type AdminUserData = {
  accountStatus: "verified" | "unverified";
  briefings: BriefingRecord[];
  reengagementNotifications: ReengagementRecord[];
  profileComplete: boolean;
};

export type AdminUserDataResult =
  | { ok: true; data: AdminUserData }
  | { ok: false; code: "CONFIG_ERROR" | "VALIDATION_ERROR" | "NOT_FOUND" | "DB_ERROR" | "AUTH_ERROR"; message: string };

export async function getAdminUserData(
  userId: string,
  adminUserId?: string
): Promise<AdminUserDataResult> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return { ok: false, code: "CONFIG_ERROR", message: "Server configuration error" };
  }

  const parsed = AdminUserLookupSchema.safeParse({ userId });
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // P4 patch: distinguish auth API errors from genuine "user not found"
  const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(userId);
  if (authUserError) {
    return { ok: false, code: "AUTH_ERROR", message: "Failed to fetch user from Auth service" };
  }
  if (!authUser?.user) {
    return { ok: false, code: "NOT_FOUND", message: "User not found" };
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
    return { ok: false, code: "DB_ERROR", message: `Failed to fetch user data: ${errMsg}` };
  }

  // P3 patch: write audit log when adminUserId is provided (UI path)
  if (adminUserId) {
    adminClient
      .from("audit_logs")
      .insert({ user_id: adminUserId, event_type: "admin_user_lookup", metadata: { target_user_id: userId } })
      .then(({ error }: { error: { code: string } | null }) => {
        if (error) console.error(JSON.stringify({ event: "audit_log_error", code: error.code }));
      })
      .catch((err: Error) => {
        console.error(JSON.stringify({ event: "audit_log_error", message: err.message }));
      });
  }

  const accountStatus = authUser.user.email_confirmed_at ? "verified" : "unverified";

  return {
    ok: true,
    data: {
      accountStatus,
      briefings: briefingsResult.data ?? [],
      reengagementNotifications: reengagementResult.data ?? [],
      profileComplete: !!profileResult.data,
    },
  };
}
