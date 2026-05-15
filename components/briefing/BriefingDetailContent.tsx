"use client";

import { useState } from "react";
import { BriefingCard } from "./BriefingCard";
import { CoachesObservation } from "./CoachesObservation";
import { AiDisclosureWrapper } from "@/components/shared/AiDisclosureWrapper";
import { isValidContent, VALID_DOMAINS, isSafeUrl } from "@/lib/briefing/content";
import type { Domain } from "@/components/ui/domain-chip";

interface BriefingRow {
  id: string;
  content: unknown;
  helpful: boolean | null;
  briefing_date: string;
}

export function BriefingDetailContent({ briefing }: { briefing: BriefingRow }) {
  const [helpful, setHelpful] = useState<boolean | null>(briefing.helpful ?? null);

  async function handleFeedback(value: boolean) {
    setHelpful(value);
    await fetch(`/api/briefing/${briefing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpful: value }),
    });
  }

  const content = isValidContent(briefing.content) ? briefing.content : null;
  if (!content) return null;

  return (
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
              helpful={helpful}
              onFeedback={handleFeedback}
            />
          );
        })}
        {content.observation && <CoachesObservation body={content.observation} />}
      </div>
    </AiDisclosureWrapper>
  );
}
