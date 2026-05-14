import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Redirect new users to onboarding if profile not yet created
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, briefing_time")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Good morning, {profile.name}.</h1>
        <p className="text-sm text-muted-foreground">Your daily briefing is on its way.</p>
      </div>

      {/* Empty state — briefing not yet generated (Epic 4 will replace this) */}
      <div className="rounded-lg border-2 border-dashed border-border p-8 text-center space-y-3">
        <CoachVoiceLine variant="empty">
          Your first briefing arrives tomorrow at {profile.briefing_time}. While you wait — how are you feeling today?
        </CoachVoiceLine>
        <p className="text-xs text-muted-foreground">Daily check-in coming in Epic 3</p>
      </div>

      <form action="/api/auth/sign-out" method="POST" className="pt-4">
        <button
          type="submit"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
