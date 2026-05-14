import { NextRequest, NextResponse } from "next/server";
import { SignUpSchema } from "@/lib/validation/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per IP per 15 minutes
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`sign-up:${ip}`, 5);
  if (!rl.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many sign-up attempts — please wait 15 minutes." } },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  // Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  const parsed = SignUpSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstIssue.message, field: firstIssue.path[0] } },
      { status: 422 }
    );
  }

  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Map Supabase errors to user-friendly messages — never expose raw errors
    if (error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("already exists")) {
      return NextResponse.json(
        { error: { code: "EMAIL_EXISTS", message: "An account with this email already exists — try signing in." } },
        { status: 400 }
      );
    }
    console.log(JSON.stringify({ event: "sign_up_error", code: error.status }));
    return NextResponse.json(
      { error: { code: "SIGNUP_FAILED", message: "Could not create account. Please try again." } },
      { status: 500 }
    );
  }

  // Supabase may return a user without error even for duplicates (security feature)
  // If user exists and email is confirmed, it means duplicate
  if (data.user && !data.session && data.user.identities?.length === 0) {
    return NextResponse.json(
      { error: { code: "EMAIL_EXISTS", message: "An account with this email already exists — try signing in." } },
      { status: 400 }
    );
  }

  return NextResponse.json({ data: { email, emailSent: true } });
}
