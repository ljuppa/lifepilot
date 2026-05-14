import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("audit_logs").insert({
      event_type: "cookie_consent",
      user_id: null,
      metadata: { source: "banner" },
    });

    if (error) {
      // Log but don't fail — consent UI already dismissed
      console.log(JSON.stringify({ event: "cookie_consent_log_failed", code: error.code }));
    }

    return NextResponse.json({ data: { recorded: true } });
  } catch {
    return NextResponse.json({ data: { recorded: false } });
  }
}
