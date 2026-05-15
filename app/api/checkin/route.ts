import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { CheckinSchema } from "@/lib/validation/checkin";

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
    .from("checkins")
    .select("*")
    .eq("user_id", user.id)
    .order("checked_in_at", { ascending: false })
    .limit(90);

  if (error) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch check-ins." } },
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
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Invalid JSON." } },
      { status: 400 }
    );
  }

  const parsed = CheckinSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: issue.message, field: issue.path[0] } },
      { status: 422 }
    );
  }

  const checkedInAt = parsed.data.checked_in_at ?? new Date().toISOString();

  // Reject stale checkins (older than 24 hours — used by offline sync)
  const age = Date.now() - new Date(checkedInAt).getTime();
  if (age > 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: { code: "STALE_CHECKIN", message: "Check-in is too old to submit." } },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("checkins")
    .insert({ user_id: user.id, ...parsed.data, checked_in_at: checkedInAt })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to save check-in." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
