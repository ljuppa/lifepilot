import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DataActions from "./DataActions";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export default async function DataPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [
    profileRes,
    { count: goalCount },
    { count: checkinCount },
    { data: oldestCheckin },
    { data: newestCheckin },
    { count: briefingCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("goals").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("checkins")
      .select("checked_in_at")
      .eq("user_id", user.id)
      .order("checked_in_at", { ascending: true })
      .limit(1),
    supabase
      .from("checkins")
      .select("checked_in_at")
      .eq("user_id", user.id)
      .order("checked_in_at", { ascending: false })
      .limit(1),
    supabase
      .from("briefings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const profile = profileRes.data;

  const checkinRange =
    checkinCount && checkinCount > 0 && oldestCheckin?.[0] && newestCheckin?.[0]
      ? ` (${formatDate(oldestCheckin[0].checked_in_at)} – ${formatDate(newestCheckin[0].checked_in_at)})`
      : "";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold mb-2">Your data</h1>
      <p className="text-sm text-muted-foreground mb-8">
        This page shows the data LifePilot holds about you and lets you export or delete it.
      </p>

      <section aria-label="Your data summary" className="mb-10 space-y-6">
        <h2 className="text-lg font-semibold">What we store about you</h2>

        {profile && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Profile</h3>
            <dl className="text-sm space-y-1">
              {profile.name && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd>{profile.name}</dd>
                </div>
              )}
              {profile.age && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Age:</dt>
                  <dd>{profile.age}</dd>
                </div>
              )}
              {profile.gender && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Gender:</dt>
                  <dd>{profile.gender}</dd>
                </div>
              )}
              {profile.height && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Height:</dt>
                  <dd>{profile.height}</dd>
                </div>
              )}
              {profile.weight && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Weight:</dt>
                  <dd>{profile.weight}</dd>
                </div>
              )}
              {profile.location && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Location:</dt>
                  <dd>{profile.location}</dd>
                </div>
              )}
              {profile.discretionary_budget !== undefined &&
                profile.discretionary_budget !== null && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Monthly budget:</dt>
                    <dd>{profile.discretionary_budget}</dd>
                  </div>
                )}
              {profile.briefing_time && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Briefing time:</dt>
                  <dd>{profile.briefing_time}</dd>
                </div>
              )}
              {profile.created_at && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Member since:</dt>
                  <dd>{formatDate(profile.created_at)}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Activity</h3>
          <dl className="text-sm space-y-1">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Goals:</dt>
              <dd>{goalCount ?? 0}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Check-ins:</dt>
              <dd>
                {checkinCount ?? 0}
                {checkinRange}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Briefings:</dt>
              <dd>{briefingCount ?? 0}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Data processors</h3>
          <p className="text-sm text-muted-foreground">
            Your data is processed by: Supabase (database, auth, storage), Anthropic (AI
            briefings), Resend (email delivery), Vercel (hosting), Inngest (background jobs).
          </p>
        </div>
      </section>

      <DataActions />
    </div>
  );
}
