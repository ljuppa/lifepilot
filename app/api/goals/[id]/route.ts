import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { GoalInputSchema } from "@/lib/validation/goal";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid JSON." } }, { status: 400 });
  }

  const parsed = GoalInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: issue.message } },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from("goals")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to update goal." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { updated: true } });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Soft-delete: set status to inactive
  const { error } = await supabase
    .from("goals")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to remove goal." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true } });
}
