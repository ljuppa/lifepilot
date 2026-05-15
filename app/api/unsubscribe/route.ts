import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

const VALID_TYPES = ["briefingEmails", "reengagementEmails"] as const;
type ValidType = (typeof VALID_TYPES)[number];

function htmlResponse(body: string, status = 200) {
  return new Response(`<html><body><p>${body}</p></body></html>`, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");
  const type = searchParams.get("type");

  if (!token || !userId || !type) {
    return htmlResponse("Invalid unsubscribe link.", 400);
  }

  if (!VALID_TYPES.includes(type as ValidType)) {
    return htmlResponse("Invalid unsubscribe link.", 400);
  }

  if (!verifyUnsubscribeToken(userId, type, token)) {
    return htmlResponse("Invalid unsubscribe link.", 400);
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await adminClient
    .from("profiles")
    .select("notification_preferences")
    .eq("id", userId)
    .single();

  const updated = { ...((profile?.notification_preferences as object) ?? {}), [type]: false };

  await adminClient.from("profiles").update({ notification_preferences: updated }).eq("id", userId);

  return htmlResponse("You have been unsubscribed.");
}
