import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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
