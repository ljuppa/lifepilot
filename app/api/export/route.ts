import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
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

  // P1: rate-limit to 3 export requests per 15-minute window per user
  const { ok, retryAfterSeconds } = await checkRateLimit(`export:${user.id}`, 3);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Export already requested. Please wait before requesting another." } },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  // P7: idempotency key scoped to user + day prevents duplicate jobs from double-clicks
  const idempotencyKey = `export:${user.id}:${new Date().toISOString().slice(0, 10)}`;
  await inngest.send({
    name: "export/data.requested",
    data: { userId: user.id, triggeredAt: new Date().toISOString() },
    id: idempotencyKey,
  });

  await supabase
    .from("audit_logs")
    .insert({ user_id: user.id, event_type: "data_export_requested" })
    .then(({ error }) => {
      if (error)
        console.error(
          JSON.stringify({ event: "audit_log_failed", userId: user.id, code: error.code })
        );
    });

  return NextResponse.json({
    data: { message: "Your export is being prepared — you'll receive an email when it's ready." },
  });
}
