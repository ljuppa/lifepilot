import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { AdminBroadcastSchema } from "@/lib/validation/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== null) {
    const host = request.headers.get("host") ?? "";
    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === host;
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cross-origin request rejected." } },
        { status: 403 }
      );
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: { code: "CONFIG_ERROR", message: "Server misconfiguration." } }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  const { ok, retryAfterSeconds } = await checkRateLimit(`broadcast:${user.id}`, 3);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many broadcast requests. Please wait before sending another." } },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const parsed = AdminBroadcastSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } },
      { status: 400 }
    );
  }

  const { subject, body: broadcastBody } = parsed.data;

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profile, error: roleError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (roleError) {
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Failed to verify permissions." } }, { status: 500 });
  }

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });
  }

  await inngest.send({
    name: "notification/broadcast.requested",
    data: { adminUserId: user.id, subject, body: broadcastBody, triggeredAt: new Date().toISOString() },
  });

  console.log(JSON.stringify({ event: "admin_broadcast_queued", adminUserId: user.id, subject }));

  adminClient
    .from("audit_logs")
    .insert({
      user_id: user.id,
      event_type: "admin_broadcast_queued",
      metadata: { subject },
    })
    .then(({ error }: { error: { code: string } | null }) => {
      if (error) console.error(JSON.stringify({ event: "audit_log_error", code: error.code }));
    })
    .catch((err: Error) => {
      console.error(JSON.stringify({ event: "audit_log_error", message: err.message }));
    });

  return NextResponse.json({ data: { message: "Broadcast queued — users will receive it shortly." } });
}
