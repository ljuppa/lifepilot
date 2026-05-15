import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AiDisclosureWrapper } from "@/components/shared/AiDisclosureWrapper";
import { BriefingCard } from "@/components/briefing/BriefingCard";
import { CoachesObservation } from "@/components/briefing/CoachesObservation";
import { BriefingCardSkeleton } from "@/components/briefing/BriefingCardSkeleton";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";
import type { Domain } from "@/components/ui/domain-chip";

interface BriefingContent {
  greeting: string;
  suggestions: Array<{
    domain: string;
    title: string;
    body: string;
    action_link_text?: string | null;
    action_link_url?: string | null;
  }>;
  observation?: string | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, briefing_time")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const today = new Date().toISOString().split("T")[0];

  const [briefingResult, countResult] = await Promise.all([
    supabase
      .from("briefings")
      .select("id, content, briefing_date, email_status, safety_filter_triggered")
      .eq("user_id", user.id)
      .eq("briefing_date", today)
      .maybeSingle(),
    supabase
      .from("briefings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const briefing = briefingResult.data;
  const isFirstTime = (countResult.count ?? 0) === 0;
  const content = briefing?.content as BriefingContent | null;

  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-4">
      {briefing && content ? (
        <AiDisclosureWrapper>
          <div className="space-y-4">
            <BriefingCard variant="greeting" body={content.greeting} />

            {content.suggestions.map((s, i) => (
              <BriefingCard
                key={i}
                variant="suggestion"
                domain={s.domain as Domain}
                body={s.body}
                actionLinkText={s.action_link_text}
                actionLinkUrl={s.action_link_url}
              />
            ))}

            {content.observation && (
              <CoachesObservation body={content.observation} />
            )}
          </div>
        </AiDisclosureWrapper>
      ) : (
        <div className="space-y-4">
          <BriefingCardSkeleton />
          <CoachVoiceLine variant="empty">
            {isFirstTime
              ? `Your first briefing arrives tomorrow at ${profile.briefing_time}.`
              : "Your briefing is generating — check back in a few minutes."}
          </CoachVoiceLine>
        </div>
      )}
    </div>
  );
}
