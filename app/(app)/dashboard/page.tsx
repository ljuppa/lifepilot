import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AiDisclosureWrapper } from "@/components/shared/AiDisclosureWrapper";
import { BriefingCard } from "@/components/briefing/BriefingCard";
import { CoachesObservation } from "@/components/briefing/CoachesObservation";
import { BriefingCardSkeleton } from "@/components/briefing/BriefingCardSkeleton";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";
import type { Domain } from "@/components/ui/domain-chip";

const VALID_DOMAINS = new Set<string>(["health", "finance", "wellness"]);

interface BriefingSuggestion {
  domain: string;
  title: string;
  body: string;
  action_link_text?: string | null;
  action_link_url?: string | null;
}

interface BriefingContent {
  greeting: string;
  suggestions: BriefingSuggestion[];
  observation?: string | null;
}

function isValidContent(value: unknown): value is BriefingContent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.greeting === "string" && Array.isArray(v.suggestions);
}

function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().trimStart();
  return lower.startsWith("/") || lower.startsWith("https://") || lower.startsWith("http://");
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
      .eq("user_id", user.id)
      .lt("briefing_date", today),
  ]);

  const briefing = briefingResult.error ? null : briefingResult.data;
  const isFirstTime = countResult.error ? false : (countResult.count ?? 0) === 0;
  const content = isValidContent(briefing?.content) ? briefing!.content : null;

  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-4">
      {briefing && content ? (
        <AiDisclosureWrapper>
          <div className="space-y-4">
            <BriefingCard variant="greeting" body={content.greeting} />

            {content.suggestions.map((s, i) => {
              const domain = VALID_DOMAINS.has(s.domain) ? (s.domain as Domain) : "wellness";
              const safeUrl = isSafeUrl(s.action_link_url) ? s.action_link_url : null;
              return (
                <BriefingCard
                  key={`${s.domain}-${i}`}
                  variant="suggestion"
                  domain={domain}
                  body={s.body}
                  actionLinkText={s.action_link_text}
                  actionLinkUrl={safeUrl}
                />
              );
            })}

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
