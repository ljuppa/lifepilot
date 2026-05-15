import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { inngest } from "@/lib/inngest/client";

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

  await inngest.send({
    name: "export/data.requested",
    data: { userId: user.id, triggeredAt: new Date().toISOString() },
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
