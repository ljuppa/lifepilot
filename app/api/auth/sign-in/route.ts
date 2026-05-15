import { NextRequest, NextResponse } from "next/server";
import { SignInSchema } from "@/lib/validation/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`sign-in:${ip}`, 5);
  if (!rl.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many sign-in attempts — please wait 15 minutes." } },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  const parsed = SignInSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstIssue.message, field: firstIssue.path[0] } },
      { status: 422 }
    );
  }

  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Generic message regardless of which field is wrong — never reveal specifics
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } },
      { status: 401 }
    );
  }

  return NextResponse.json({ data: { signedIn: true } });
}
