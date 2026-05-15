"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { DomainChipDisplay, type Domain } from "@/components/ui/domain-chip";

const DOMAIN_FILL: Record<Domain, string> = {
  health: "text-primary",
  finance: "text-accent",
  wellness: "text-slate-500",
};

interface BriefingCardGreetingProps {
  variant: "greeting";
  body: string;
}

interface BriefingCardSuggestionProps {
  variant: "suggestion";
  domain: Domain;
  body: string;
  actionLinkText?: string | null;
  actionLinkUrl?: string | null;
  helpful?: boolean | null;
  onFeedback?: (value: boolean) => void;
}

type BriefingCardProps = BriefingCardGreetingProps | BriefingCardSuggestionProps;

export function BriefingCard(props: BriefingCardProps) {
  const isGreeting = props.variant === "greeting";
  const ariaLabel = isGreeting ? "Daily greeting" : `${(props as BriefingCardSuggestionProps).domain} suggestion`;
  const suggestionProps = props as BriefingCardSuggestionProps;

  return (
    <article
      role="article"
      aria-label={ariaLabel}
      className="group relative bg-card rounded-2xl border border-border p-6 space-y-3 shadow-sm"
    >
      {!isGreeting && (
        <DomainChipDisplay domain={suggestionProps.domain} />
      )}
      <p className="prose-briefing text-foreground/90">{props.body}</p>
      {!isGreeting && suggestionProps.actionLinkText && suggestionProps.actionLinkUrl && (
        <a
          href={suggestionProps.actionLinkUrl}
          rel="noopener noreferrer"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {suggestionProps.actionLinkText} →
        </a>
      )}
      {!isGreeting && suggestionProps.onFeedback && (
        <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            onClick={() => suggestionProps.onFeedback!(true)}
            aria-label="Mark as helpful"
            aria-pressed={suggestionProps.helpful === true}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ThumbsUp
              size={18}
              className={suggestionProps.helpful === true ? DOMAIN_FILL[suggestionProps.domain] : "text-muted-foreground/50"}
            />
          </button>
          <button
            type="button"
            onClick={() => suggestionProps.onFeedback!(false)}
            aria-label="Mark as not helpful"
            aria-pressed={suggestionProps.helpful === false}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ThumbsDown
              size={18}
              className={suggestionProps.helpful === false ? DOMAIN_FILL[suggestionProps.domain] : "text-muted-foreground/50"}
            />
          </button>
        </div>
      )}
    </article>
  );
}
