import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Expired or invalid token — resend verification email if we have an email param
    const email = searchParams.get("email");
    if (email) {
      await supabase.auth.resend({ type: "signup", email });
    }
    return NextResponse.redirect(
      `${origin}/auth/verify-email?resent=${email ? "true" : "false"}&error=expired`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
