import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ProfileUpdateSchema } from "@/lib/validation/profile";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ data: null });
    }
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch profile." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid JSON." } }, { status: 400 });
  }

  const parsed = ProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: issue.message, field: issue.path[0] } },
      { status: 422 }
    );
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    ...parsed.data,
  });

  if (error) {
    console.log(JSON.stringify({ event: "profile_create_error", code: error.code }));
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to save profile." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { created: true } });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid JSON." } }, { status: 400 });
  }

  const parsed = ProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: issue.message, field: issue.path[0] } },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to update profile." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { updated: true } });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const userId = user.id;
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Audit log first — durable compliance record before any data is destroyed
  const { error: auditError } = await adminClient
    .from("audit_logs")
    .insert({ user_id: userId, event_type: "account_deleted" });
  if (auditError) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to initiate account deletion." } },
      { status: 500 }
    );
  }

  // 2. Hard-delete user data (sequential — order matters for GDPR compliance)
  await adminClient.from("checkins").delete().eq("user_id", userId);
  await adminClient.from("briefings").delete().eq("user_id", userId);
  await adminClient.from("goals").delete().eq("user_id", userId);
  await adminClient.from("audit_logs").delete().eq("user_id", userId);

  // 3. Delete auth user — cascades to profiles row
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error(JSON.stringify({ event: "account_deletion_failed", userId, code: deleteError.message }));
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to delete account." } },
      { status: 500 }
    );
  }

  // 4. Clear session cookie
  await supabase.auth.signOut();

  // 5. Durable audit trail in logs (DB row was deleted above)
  console.log(JSON.stringify({ event: "account_deleted", userId }));

  return NextResponse.json({ data: { deleted: true } });
}
