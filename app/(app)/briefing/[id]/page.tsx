import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BriefingDetailContent } from "@/components/briefing/BriefingDetailContent";

export default async function BriefingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, briefing_time")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const { data: briefing, error } = await supabase
    .from("briefings")
    .select("id, content, helpful, briefing_date, email_status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !briefing) redirect("/briefing");

  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-4">
      <BriefingDetailContent briefing={briefing} />
    </div>
  );
}
